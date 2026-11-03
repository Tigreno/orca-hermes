import React from 'react'
import { ChevronsUpDown, Terminal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AgentIcon, type AgentCatalogEntry } from '@/lib/agent-catalog'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { rowLabel } from '@/components/tab-bar/tab-agent-row-presentation'
import { AgentIconLabel } from './agent-combobox-items'
import type { TuiAgent } from '../../../../shared/tui-agent'

export function AgentComboboxTriggerContent({
  canClear,
  selectionCleared,
  selectedCustomAgent,
  selectedAgent,
  picksCli,
  allowBlankTerminal,
  blankText
}: {
  canClear: boolean
  selectionCleared: boolean
  selectedCustomAgent: { label: string; baseAgent: TuiAgent } | null
  selectedAgent: AgentCatalogEntry | null
  picksCli: boolean
  allowBlankTerminal: boolean
  blankText: string
}): React.JSX.Element {
  return (
    <>
      <span className={cn('inline-flex min-w-0 flex-1', canClear && 'pr-8')}>
        {selectionCleared ? (
          <span className="truncate text-muted-foreground">
            {translate('components.agentSessionContinuation.selectAgent', 'Select an Agent')}
          </span>
        ) : selectedCustomAgent ? (
          <AgentIconLabel
            icon={<AgentIcon agent={selectedCustomAgent.baseAgent} size={14} />}
            label={selectedCustomAgent.label}
          />
        ) : selectedAgent ? (
          <AgentIconLabel
            icon={<AgentIcon agent={selectedAgent.id} size={14} />}
            label={
              picksCli ? rowLabel({ kind: 'cli', agent: selectedAgent.id }) : selectedAgent.label
            }
          />
        ) : (
          <AgentIconLabel
            icon={<Terminal className="size-3.5" />}
            label={
              allowBlankTerminal
                ? blankText
                : translate('components.agentSessionContinuation.selectAgent', 'Select an Agent')
            }
          />
        )}
      </span>
      <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
    </>
  )
}

export function AgentComboboxClearButton({
  disabled,
  onClear
}: {
  disabled?: boolean
  onClear: () => void
}): React.JSX.Element {
  const label = translate('components.agentCombobox.clearSelection', 'Clear agent selection')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          className="absolute right-8 top-1/2 -translate-y-1/2"
          aria-label={label}
          onClick={onClear}
        >
          <X />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
