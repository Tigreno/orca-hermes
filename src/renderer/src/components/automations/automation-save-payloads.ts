import type {
  Automation,
  AutomationCreateInput,
  AutomationUpdateInput
} from '../../../../shared/automations-types'
import type { AutomationDraft } from './AutomationEditorDialog'

/** Only edited fields ship; the server preserves everything else. */
export function buildAutomationUpdateInput(input: {
  currentAutomation: Automation | null
  draft: AutomationDraft
  edited: (key: keyof AutomationDraft) => boolean
  precheck: AutomationUpdateInput['precheck']
  launchSetup: Pick<AutomationUpdateInput, 'launchSetupPatch' | 'extraAgentArgs'>
  targetEdited: boolean
  runContext: AutomationUpdateInput['runContext']
  setupDecision: AutomationUpdateInput['setupDecision']
  missedRunGraceMinutes: number
}): AutomationUpdateInput {
  const { currentAutomation, draft, edited, precheck, launchSetup, targetEdited } = input
  return {
    ...(edited('name') ? { name: draft.name } : {}),
    ...(edited('prompt') ? { prompt: draft.prompt } : {}),
    ...(edited('precheckCommand') || edited('precheckTimeoutSeconds') ? { precheck } : {}),
    ...(edited('agentId') ? { agentId: draft.agentId } : {}),
    ...(!currentAutomation || edited('surface') || edited('extraAgentArgs') ? launchSetup : {}),
    ...(targetEdited
      ? {
          runContext: input.runContext,
          projectId: draft.projectId,
          workspaceMode: draft.workspaceMode,
          workspaceId: draft.workspaceId
        }
      : {}),
    ...(currentAutomation && edited('customAgentProfileId')
      ? { customAgentProfileId: draft.customAgentProfileId }
      : {}),
    ...(edited('baseBranch') ? { baseBranch: draft.baseBranch.trim() || null } : {}),
    ...(edited('setupDecision') || input.setupDecision !== currentAutomation?.setupDecision
      ? { setupDecision: input.setupDecision }
      : {}),
    ...(edited('reuseSession') || edited('workspaceMode')
      ? { reuseSession: draft.workspaceMode === 'existing' && draft.reuseSession }
      : {}),
    ...(edited('missedRunGraceMinutes')
      ? { missedRunGraceMinutes: input.missedRunGraceMinutes }
      : {})
  }
}

/** Move/create inputs inherit the stored row and overlay the edited patch. */
export function buildAutomationCreateInput(input: {
  currentAutomation: Automation | null
  draft: AutomationDraft
  precheck: AutomationCreateInput['precheck']
  launchSetup: Pick<AutomationCreateInput, 'launchSetupPatch' | 'extraAgentArgs'>
  runContext: AutomationCreateInput['runContext']
  setupDecision: AutomationCreateInput['setupDecision']
  timezone: string
  rrule: string
  now: number
  updates: AutomationUpdateInput
  missedRunGraceMinutes: number
}): AutomationCreateInput {
  const { currentAutomation, draft } = input
  return {
    name: currentAutomation ? currentAutomation.name : draft.name,
    prompt: currentAutomation ? currentAutomation.prompt : draft.prompt,
    precheck: currentAutomation ? currentAutomation.precheck : input.precheck,
    agentId: currentAutomation ? currentAutomation.agentId : draft.agentId,
    ...input.launchSetup,
    runContext: currentAutomation ? currentAutomation.runContext : input.runContext,
    projectId: currentAutomation ? currentAutomation.projectId : draft.projectId,
    workspaceMode: currentAutomation ? currentAutomation.workspaceMode : draft.workspaceMode,
    workspaceId: currentAutomation ? currentAutomation.workspaceId : draft.workspaceId,
    baseBranch: currentAutomation ? currentAutomation.baseBranch : draft.baseBranch.trim() || null,
    setupDecision: currentAutomation ? currentAutomation.setupDecision : input.setupDecision,
    reuseSession: currentAutomation
      ? currentAutomation.reuseSession
      : draft.workspaceMode === 'existing' && draft.reuseSession,
    timezone: input.timezone,
    rrule: currentAutomation ? currentAutomation.rrule : input.rrule,
    dtstart: currentAutomation ? currentAutomation.dtstart : (input.updates.dtstart ?? input.now),
    missedRunGraceMinutes: currentAutomation
      ? currentAutomation.missedRunGraceMinutes
      : input.missedRunGraceMinutes,
    ...input.updates,
    customAgentProfileId: draft.customAgentProfileId ?? undefined
  }
}
