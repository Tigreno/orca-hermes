// Stub: Hermes-target save action is not supported in this build.
// Real implementation will land alongside the Hermes automation API.
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import type { AutomationSaveContext } from './automation-save-context'

export async function saveHermesAutomation(context: AutomationSaveContext): Promise<void> {
  toast.error(
    translate(
      'auto.components.automations.automation-hermes-save.unimplemented',
      'Saving to a Hermes target is not yet available in this build.'
    )
  )
  context.local.setIsSaving(false)
}
