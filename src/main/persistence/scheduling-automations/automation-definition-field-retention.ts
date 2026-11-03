import type { Automation } from '../../../shared/automations-types'

/** Explicit null clears a stored field; an omitted value preserves the current one. */
export function retainAutomationOptionalFields(
  merged: Automation,
  current: Automation,
  options: { extraAgentArgs: Automation['extraAgentArgs']; retainContexts: boolean }
): void {
  if (options.retainContexts && !Object.hasOwn(current, 'sourceContext')) {
    delete merged.sourceContext
  }
  if (options.extraAgentArgs === undefined) {
    delete merged.extraAgentArgs
  } else {
    merged.extraAgentArgs = options.extraAgentArgs
  }
}
