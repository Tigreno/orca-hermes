import {
  recordedAutomationRunContext,
  isSameAutomationWorkspace
} from './automation-recorded-target'
import { capturedAutomationOwner } from '../hosts/automation-captured-owner'
import {
  automationChatSupport,
  automationDraftLaunchSetup,
  automationLaunchWorkspace
} from './automation-launch-surface'
import { toast } from 'sonner'
import type { Automation } from '../../../../../shared/automations/automation-definition'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store/index'
import { listAutomationsForTarget } from '../hosts/automation-host-client'
import {
  dispatchAutomationReread,
  type AutomationDispatchResult
} from '../hosts/automation-row-action-dispatch'
import { buildDraftPrecheck, buildDraftSchedule } from './automation-draft-model'
import { buildAutomationRunContextForRepo } from './automation-run-context'
import { resolveAutomationSetupDecisionForSave } from './automation-setup-decision'
import { confirmAutomationSaveSetup } from './automation-setup-review'
import {
  createAutomationOnDestination,
  moveAutomationToDestination,
  resolveAutomationEditDestination,
  saveExistingAutomation
} from './automation-orca-save-operations'
import type { AutomationSaveContext } from './automation-save-context'
import { completeAutomationSave } from './automation-save-completion'
import { buildAutomationSaveInputs } from './automation-orca-save-inputs'

/** Saves an Orca automation, including destination validation and host moves. */
export async function saveOrcaAutomation(
  context: AutomationSaveContext,
  time: { hour: number; minute: number; now: number; surface: 'chat' | 'terminal' }
): Promise<void> {
  const { store, local, setup, destination, destinationForm } = context
  const { projectHostSetups } = store
  const {
    draft,
    editingAutomationId,
    editingRowKey,
    draftAtOpen,
    setEditorNotice,
    setEditorNoticeHost,
    moveCreationKeysRef
  } = local
  const {
    automationHostTarget,
    automationDispatchContext,
    invalidateWrittenHost,
    rowRecoveryHost,
    createDestination
  } = destination
  const { dialogRepos, editHostResolution, automationDialogTarget, editingDestination } =
    destinationForm

  // Fence the destination before hook probes/trust prompts or any other transaction side effect.
  const createCheck = editingAutomationId === null ? createDestination.check(draft.projectId) : null
  if (createCheck && !createCheck.ok) {
    setEditorNotice(createCheck.notice)
    return
  }

  let currentAutomation: Automation | null = null
  if (editingAutomationId !== null) {
    const reread = await dispatchAutomationReread(
      automationDispatchContext,
      { rowKey: editingRowKey ?? '', automationId: editingAutomationId },
      async () =>
        (await listAutomationsForTarget(automationHostTarget ?? { kind: 'local' })).find(
          (automation) => automation.id === editingAutomationId
        ) ?? null
    )
    if (!reread.ok) {
      setEditorNotice(reread.notice)
      return
    }
    currentAutomation = reread.value
    if (!currentAutomation) {
      throw new Error('This automation is no longer available. Refresh and try again.')
    }
  }

  const edited = (key: keyof typeof draft): boolean =>
    !draftAtOpen || draft[key] !== draftAtOpen[key]
  const targetEdited = !currentAutomation || local.targetEdited
  const timezone = currentAutomation?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const { rrule, missedRunGraceMinutes } = buildDraftSchedule(draft, time)
  const precheck = buildDraftPrecheck(draft)
  const recordedContext =
    currentAutomation && editingDestination && isSameAutomationWorkspace(currentAutomation, draft)
      ? recordedAutomationRunContext(
          currentAutomation,
          capturedAutomationOwner(context.list.capturedAutomationOwners, editingRowKey),
          editingDestination.destination
        )
      : null
  const setupResolution =
    editingAutomationId !== null
      ? editHostResolution
      : createCheck
        ? { status: 'ready' as const, ...createCheck.destination }
        : null
  if (
    draft.customAgentProfileId &&
    setupResolution?.status === 'ready' &&
    setupResolution.authority.kind === 'runtime'
  ) {
    toast.error(
      translate(
        'auto.components.automations.AutomationsPage.customAgentRemoteHost',
        'Choose a built-in agent for automations stored on a paired Orca host.'
      )
    )
    return
  }
  const selectedRepos = dialogRepos.filter((repo) => repo.id === draft.projectId)
  const setupHostId =
    setupResolution?.status === 'ready' && selectedRepos.length === 1
      ? getRepoExecutionHostId(selectedRepos[0])
      : undefined
  const setupProjectHostSetups = setupHostId
    ? projectHostSetups.filter(
        (candidate) => candidate.repoId !== draft.projectId || candidate.hostId === setupHostId
      )
    : projectHostSetups
  let setupDecision =
    !currentAutomation || edited('setupDecision')
      ? resolveAutomationSetupDecisionForSave({
          workspaceMode: draft.workspaceMode,
          repoId: draft.projectId,
          repos: dialogRepos,
          projectHostSetups: setupProjectHostSetups,
          yamlHooks:
            draft.workspaceMode === 'new_per_run'
              ? await setup.loadAutomationYamlHooksForRepo(draft.projectId, setupHostId)
              : null,
          draftSetupDecision: draft.setupDecision
        })
      : currentAutomation.setupDecision
  const { trust, setupTrustHash } = await confirmAutomationSaveSetup(context, {
    // Confirm setup on the base this automation will use.
    prompt:
      setupDecision === 'run' &&
      ((targetEdited && !recordedContext) || edited('setupDecision') || edited('baseBranch')),
    repoId: draft.projectId,
    hostId: setupHostId,
    baseBranch: edited('baseBranch') ? draft.baseBranch : currentAutomation?.baseBranch,
    setupDecision,
    automation: currentAutomation
  })
  if (trust?.decision === 'skip') {
    setupDecision = 'skip'
  }

  const runContext = targetEdited
    ? (recordedContext ??
      buildAutomationRunContextForRepo({
        repoId: draft.projectId,
        repos: dialogRepos,
        projectHostSetups: setupProjectHostSetups
      }))
    : currentAutomation?.runContext
  if (targetEdited && !runContext) {
    toast.error(
      translate(
        'auto.components.automations.AutomationsPage.32534e7c9c',
        'Choose an available workspace before saving.'
      )
    )
    return
  }

  const surface =
    time.surface === 'chat' &&
    draft.surface === undefined &&
    automationChatSupport(
      useAppStore.getState(),
      draft,
      automationLaunchWorkspace(draft, setupResolution ?? undefined)
    ) === false
      ? 'terminal'
      : time.surface
  const launchSetup = automationDraftLaunchSetup(
    {
      launchSetupPatch: draft.launchSetupPatch,
      extraAgentArgs: edited('extraAgentArgs')
        ? draft.extraAgentArgs
        : (currentAutomation?.extraAgentArgs ?? '')
    },
    edited('surface') ? surface : (currentAutomation?.surface ?? surface),
    currentAutomation
  )
  const { updates, createInput } = buildAutomationSaveInputs({
    draft,
    currentAutomation,
    edited,
    precheck,
    launchSetup,
    targetEdited,
    runContext,
    setupDecision,
    trust,
    setupTrustHash,
    schedule: { timezone, rrule, missedRunGraceMinutes },
    time
  })

  const destinationResult = resolveAutomationEditDestination({
    currentAutomation,
    editingAutomationId,
    editingDestination,
    draft,
    targetEdited: local.targetEdited,
    rowKey: editingRowKey,
    automationDialogTarget,
    editHostEntries: destinationForm.editHostEntries,
    rowRecoveryHost
  })
  if (!destinationResult.ok) {
    setEditorNotice(destinationResult.notice)
    return
  }
  const { editDestination, moveTarget } = destinationResult

  let saved: AutomationDispatchResult<Automation>
  let originalRemoved = true
  if (moveTarget) {
    const moved = await moveAutomationToDestination(
      {
        automationDispatchContext,
        editingRowKey,
        automationDialogTarget,
        moveCreationKeysRef,
        invalidateWrittenHost
      },
      currentAutomation,
      moveTarget,
      {
        ...createInput,
        dtstart: updates.dtstart ?? currentAutomation?.dtstart ?? createInput.dtstart,
        enabled: currentAutomation?.enabled ?? true,
        sourceContext: currentAutomation?.sourceContext ?? null
      }
    )
    saved = moved.saved
    originalRemoved = moved.originalRemoved
  } else if (editingAutomationId !== null) {
    saved = await saveExistingAutomation(
      context,
      editingAutomationId,
      currentAutomation,
      updates,
      editDestination,
      automationHostTarget,
      editingRowKey
    )
  } else {
    saved = await createAutomationOnDestination(
      createCheck!.destination.authority,
      createInput,
      createCheck!.destination,
      invalidateWrittenHost
    )
  }
  if (!saved.ok) {
    setEditorNotice(saved.notice)
    setEditorNoticeHost(moveTarget?.entry ?? null)
    return
  }
  await completeAutomationSave(context, saved.value, moveTarget, originalRemoved)
}
