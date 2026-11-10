import type {
  Automation,
  AutomationUpdateInput
} from '../../../shared/automations/automation-definition'
import { automationCanonicalLaunchSetup } from '../../../shared/automations/launch/automation-canonical-launch-setup'
import { assertAutomationExtraAgentArgs } from '../../../shared/automations/launch/automation-extra-agent-args-record'

export type AutomationUpdateFields = Omit<AutomationUpdateInput, 'launchSetupPatch'> &
  Pick<Automation, 'surface'>

/** An explicit null clears the launch profile; an omitted value leaves the stored one alone. */
export function takeCustomAgentProfileUpdate(fields: AutomationUpdateFields): {
  customAgentProfileId: string | null | undefined
  rest: Omit<AutomationUpdateFields, 'customAgentProfileId'>
} {
  const { customAgentProfileId, ...rest } = fields
  return { customAgentProfileId, rest }
}

export function applyAutomationUpdateFields(
  merged: Automation,
  launchSetupUpdate: AutomationUpdateInput,
  customAgentProfileId: string | null | undefined
): void {
  delete merged.launchSetup
  for (const key of ['surface', 'launchPreferences', 'agentArgs', 'extraAgentArgs'] as const) {
    delete merged[key]
  }
  Object.assign(merged, automationCanonicalLaunchSetup(launchSetupUpdate))
  assertAutomationExtraAgentArgs(merged)
  if (customAgentProfileId === null) {
    delete merged.customAgentProfileId
  } else if (customAgentProfileId !== undefined) {
    merged.customAgentProfileId = customAgentProfileId
  }
}
