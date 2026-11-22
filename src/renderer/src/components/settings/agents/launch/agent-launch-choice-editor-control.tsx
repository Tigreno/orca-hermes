import type { Ref } from 'react'
import { AgentLaunchChoiceEditor } from '@/components/agent/launch-settings/AgentLaunchChoiceEditor'
import type { AgentCatalogEntry } from '@/lib/agent-catalog/agent-catalog'
import type { AgentDetectionTarget } from '@/lib/agent-session/launch/inventory/useDetectedAgents'
import type { AgentPermissionChoiceRow } from '../../../agent/launch-settings/agent-permission-choice-row'
import type {
  AgentLaunchSettings,
  AgentLaunchSettingsMutation
} from '../../../../../../shared/agent-launch/choices/agent-launch-settings'

export function buildAgentLaunchChoiceEditorControl({
  detectionTarget,
  agent,
  isDetected,
  settings,
  permission,
  mutate
}: {
  detectionTarget: AgentDetectionTarget
  agent: AgentCatalogEntry
  isDetected: boolean
  settings: AgentLaunchSettings
  permission: AgentPermissionChoiceRow | undefined
  mutate: (mutation: AgentLaunchSettingsMutation) => Promise<void>
}): (permissionControlRef: Ref<HTMLDivElement>) => React.JSX.Element {
  return (permissionControlRef) => (
    <AgentLaunchChoiceEditor
      permissionControlRef={permissionControlRef}
      showArguments={isDetected}
      catalogTarget={
        detectionTarget.kind === 'ssh'
          ? null
          : detectionTarget.kind === 'runtime'
            ? { kind: 'environment', environmentId: detectionTarget.environmentId }
            : { kind: 'local' }
      }
      agent={agent.id}
      label={agent.label}
      choices={settings.agentChoices?.defaults[agent.id]}
      userArgs={settings.agentChoices?.userArgs[agent.id] ?? ''}
      permission={permission}
      save={(patch, userArgs) =>
        mutate({ type: 'launch-choices', agent: agent.id, patch, userArgs })
      }
    />
  )
}
