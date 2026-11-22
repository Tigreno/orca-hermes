import type { TuiAgent } from '../../../../../../shared/agent-launch/catalog/tui-agent'
import type { AgentCatalogEntry } from '@/lib/agent-catalog/agent-catalog'
import type { CustomAgentProfile } from '../../../../../../shared/custom-agent-profile'

/** Local-only custom agent profile wiring; paired hosts keep their own settings. */
export type LocalCustomAgentControls = {
  defaultProfile: CustomAgentProfile | null
  onSetBuiltInDefault: (agent: TuiAgent | 'blank' | null) => void
  onDuplicateAsCustom: (agent: AgentCatalogEntry) => void
  duplicateDisabled: boolean
  afterDetectedAgents: React.ReactNode
}
