import type {
  Automation,
  AutomationUpdateInput
} from '../../../../../shared/automations/automation-definition'
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
  setupTrustHash: AutomationUpdateInput['setupTrustHash']
  missedRunGraceMinutes: number
}): AutomationUpdateInput {
  const { currentAutomation, draft, edited, precheck, launchSetup } = input
  return {
    ...(edited('name') ? { name: draft.name } : {}),
    ...(edited('prompt') ? { prompt: draft.prompt } : {}),
    ...(edited('precheckCommand') || edited('precheckTimeoutSeconds') ? { precheck } : {}),
    ...(edited('agentId') ? { agentId: draft.agentId } : {}),
    ...(!currentAutomation ||
    draft.launchSetupPatch ||
    edited('surface') ||
    edited('extraAgentArgs')
      ? launchSetup
      : {}),
    ...(input.targetEdited
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
    ...(input.setupTrustHash ? { setupTrustHash: input.setupTrustHash } : {}),
    ...(edited('reuseSession') || edited('workspaceMode')
      ? { reuseSession: draft.workspaceMode === 'existing' && draft.reuseSession }
      : {}),
    ...(edited('missedRunGraceMinutes')
      ? { missedRunGraceMinutes: input.missedRunGraceMinutes }
      : {})
  }
}
