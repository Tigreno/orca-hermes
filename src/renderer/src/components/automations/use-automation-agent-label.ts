import { useCallback } from 'react'
import type { Automation } from '../../../../shared/automations/automation-definition'
import { useAppStore } from '@/store'
import { getAgentLabel } from './authoring/automation-draft-model'

export function useAutomationAgentLabel(): (automation: Automation) => string {
  const customAgentProfiles = useAppStore((state) => state.settings?.customAgentProfiles)
  return useCallback(
    (automation) =>
      getAgentLabel(automation.agentId, automation.customAgentProfileId, customAgentProfiles),
    [customAgentProfiles]
  )
}
