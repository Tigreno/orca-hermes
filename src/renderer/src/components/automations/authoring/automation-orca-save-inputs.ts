import type {
  Automation,
  AutomationCreateInput,
  AutomationPrecheck,
  AutomationUpdateInput
} from '../../../../../shared/automations/automation-definition'
import type { SetupDecision } from '../../../../../shared/worktree/create-types'
import type { HookTrustApproval } from '@/runtime/repo-hooks/ensure-hooks-confirmed'
import type { AutomationDraft } from './AutomationEditorDialog'
import { automationCopyLaunchSetup } from './automation-launch-surface'

type AutomationSaveInputsArgs = {
  draft: AutomationDraft
  currentAutomation: Automation | null
  edited: (key: keyof AutomationDraft) => boolean
  precheck: AutomationPrecheck | null
  launchSetup: Pick<AutomationUpdateInput, 'launchSetupPatch' | 'extraAgentArgs'>
  targetEdited: boolean
  runContext: Automation['runContext']
  setupDecision: SetupDecision | undefined
  trust: HookTrustApproval | null
  setupTrustHash: string | undefined
  schedule: { timezone: string; rrule: string; missedRunGraceMinutes: number }
  time: { now: number }
}

export function buildAutomationSaveInputs({
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
  schedule,
  time
}: AutomationSaveInputsArgs): {
  updates: AutomationUpdateInput
  createInput: AutomationCreateInput
} {
  const { timezone, rrule, missedRunGraceMinutes } = schedule
  const scheduleEdited = (['preset', 'time', 'dayOfWeek', 'customSchedule'] as const).some(edited)
  const updates: AutomationUpdateInput = {
    ...(edited('name') ? { name: draft.name } : {}),
    ...(edited('prompt') ? { prompt: draft.prompt } : {}),
    ...(edited('precheckCommand') || edited('precheckTimeoutSeconds') ? { precheck } : {}),
    ...(edited('agentId') ? { agentId: draft.agentId } : {}),
    ...(currentAutomation && edited('customAgentProfileId')
      ? { customAgentProfileId: draft.customAgentProfileId }
      : {}),
    ...(!currentAutomation ||
    draft.launchSetupPatch ||
    edited('surface') ||
    edited('extraAgentArgs')
      ? launchSetup
      : {}),
    ...(targetEdited
      ? {
          runContext,
          projectId: draft.projectId,
          workspaceMode: draft.workspaceMode,
          workspaceId: draft.workspaceId
        }
      : {}),
    ...(edited('baseBranch') ? { baseBranch: draft.baseBranch.trim() || null } : {}),
    ...(trust || edited('setupDecision') || setupDecision !== currentAutomation?.setupDecision
      ? { setupDecision }
      : {}),
    ...(setupTrustHash ? { setupTrustHash } : {}),
    ...(edited('reuseSession') || edited('workspaceMode')
      ? { reuseSession: draft.workspaceMode === 'existing' && draft.reuseSession }
      : {}),
    ...(edited('missedRunGraceMinutes') ? { missedRunGraceMinutes } : {})
  }
  if (!currentAutomation || (scheduleEdited && currentAutomation.rrule !== rrule)) {
    updates.rrule = rrule
    updates.dtstart = time.now
  }
  const createInput: AutomationCreateInput = automationCopyLaunchSetup(currentAutomation, updates, {
    name: currentAutomation ? currentAutomation.name : draft.name,
    prompt: currentAutomation ? currentAutomation.prompt : draft.prompt,
    precheck: currentAutomation ? currentAutomation.precheck : precheck,
    agentId: currentAutomation ? currentAutomation.agentId : draft.agentId,
    ...launchSetup,
    runContext: currentAutomation ? currentAutomation.runContext : runContext,
    projectId: currentAutomation ? currentAutomation.projectId : draft.projectId,
    workspaceMode: currentAutomation ? currentAutomation.workspaceMode : draft.workspaceMode,
    workspaceId: currentAutomation ? currentAutomation.workspaceId : draft.workspaceId,
    baseBranch: currentAutomation ? currentAutomation.baseBranch : draft.baseBranch.trim() || null,
    setupDecision: currentAutomation ? currentAutomation.setupDecision : setupDecision,
    setupTrustHash: 'setupDecision' in updates ? setupTrustHash : currentAutomation?.setupTrustHash,
    reuseSession: currentAutomation
      ? currentAutomation.reuseSession
      : draft.workspaceMode === 'existing' && draft.reuseSession,
    timezone,
    rrule: currentAutomation ? currentAutomation.rrule : rrule,
    dtstart: currentAutomation ? currentAutomation.dtstart : (updates.dtstart ?? time.now),
    missedRunGraceMinutes: currentAutomation
      ? currentAutomation.missedRunGraceMinutes
      : missedRunGraceMinutes,
    ...updates,
    customAgentProfileId: draft.customAgentProfileId ?? undefined
  })
  return { updates, createInput }
}
