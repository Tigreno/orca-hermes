import React from 'react'
import { Terminal } from 'lucide-react'
import { AgentIcon } from '@/lib/agent-catalog'
import { renderAgentComboboxItem } from './agent-combobox-items'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'

type SearchAgent = {
  id: string
  baseAgent: TuiAgent
  label: string
  profileId: string | null
}

export function AgentComboboxSearchItems({
  blankMatchesQuery,
  blankValue,
  blankText,
  value,
  selectionCleared,
  defaultAgent,
  onSetDefault,
  onSelectBlank,
  surfaceItems,
  agents,
  customValue,
  onSelectAgent,
  onSelectCustom
}: {
  blankMatchesQuery: boolean
  blankValue: string
  blankText: string
  value: TuiAgent | null
  selectionCleared: boolean
  defaultAgent?: TuiAgent | 'blank' | null
  onSetDefault?: (agent: TuiAgent | 'blank' | null) => void
  onSelectBlank: () => void
  surfaceItems: React.ReactNode
  agents: readonly SearchAgent[]
  customValue: string | null
  onSelectAgent: (agent: TuiAgent) => void
  onSelectCustom: (profileId: string) => void
}): React.JSX.Element {
  return (
    <>
      {blankMatchesQuery
        ? renderAgentComboboxItem({
            key: blankValue,
            itemValue: blankValue,
            isChecked: value === null && !selectionCleared,
            isDefault: defaultAgent === 'blank',
            onSelect: onSelectBlank,
            onSetDefault: onSetDefault ? () => onSetDefault('blank') : undefined,
            icon: <Terminal className="size-3.5" />,
            label: blankText
          })
        : null}
      {surfaceItems}
      {agents.map((agent) => {
        const profileId = agent.profileId
        return renderAgentComboboxItem({
          key: agent.id,
          itemValue: agent.id,
          isChecked: profileId
            ? customValue === profileId
            : !customValue && value === agent.baseAgent,
          isDefault: !profileId && defaultAgent === agent.baseAgent,
          onSelect: profileId
            ? () => onSelectCustom(profileId)
            : () => onSelectAgent(agent.baseAgent),
          onSetDefault:
            !profileId && onSetDefault ? () => onSetDefault(agent.baseAgent) : undefined,
          icon: <AgentIcon agent={agent.baseAgent} />,
          label: agent.label
        })
      })}
    </>
  )
}
