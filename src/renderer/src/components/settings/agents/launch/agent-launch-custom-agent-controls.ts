import type React from 'react'
import type { AgentCatalogEntry } from '@/lib/agent-catalog/agent-catalog'
import type { CustomAgentProfile } from '../../../../../../shared/custom-agent-profile'
import type { TuiAgent } from '../../../../../../shared/agent-launch/catalog/tui-agent'

/** Local-only custom agent profile wiring; paired hosts keep their own settings. */
export type LocalCustomAgentControls = {
  profiles: readonly CustomAgentProfile[]
  defaultProfile: CustomAgentProfile | null
  onSetBuiltInDefault: (agent: TuiAgent | 'blank' | null) => void
  onSetDefaultProfile: (profileId: string) => void
  onProfilesChange: (profiles: CustomAgentProfile[]) => void | Promise<void>
  onDuplicateAsCustom: (agent: AgentCatalogEntry) => void
  duplicateDisabled: boolean
  afterDetectedAgents: React.ReactNode
}

/** A custom default claims the shortcut, so toggling a built-in agent must clear through that control. */
export function setBuiltInAgentDefault(
  currentDefault: TuiAgent | 'blank' | null,
  agent: TuiAgent,
  customAgents: LocalCustomAgentControls | undefined,
  saveBuiltIn: (agent: TuiAgent | 'blank') => void
): void {
  const next = currentDefault === agent && !customAgents?.defaultProfile ? 'blank' : agent
  if (customAgents) {
    customAgents.onSetBuiltInDefault(next)
  } else {
    saveBuiltIn(next)
  }
}
