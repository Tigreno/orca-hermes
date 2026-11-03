import React, { useCallback, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { AgentCatalogEntry } from '@/lib/agent-catalog'
import {
  agentPickerBlankTerminalMatches,
  getAgentPickerCommandValue,
  searchAgentPickerEntries
} from '@/lib/agent-picker-search'
import { cn } from '@/lib/utils'
import type { TuiAgent } from '../../../../shared/tui-agent'
import * as state from './agent-combobox-command-state'
import { AgentDefaultContextMenu } from './agent-combobox-items'
import { AgentComboboxSearchItems } from './agent-combobox-search-items'
import { AgentComboboxClearButton, AgentComboboxTriggerContent } from './agent-combobox-trigger'
import { translate } from '@/i18n/i18n'
import {
  SurfaceAgentItems,
  surfaceCommandValues,
  useSurfaceRowArming,
  type AgentComboboxSurfaceRows
} from './agent-combobox-surface-items'

type DefaultAgentPreference = TuiAgent | 'blank' | null

// Blank Terminal is opt-in; agent-only automation/source-control flows cannot run it or accept null.
type AgentComboboxSelectionProps =
  | { allowBlankTerminal: true; onValueChange: (agent: TuiAgent | null) => void }
  | { allowBlankTerminal?: false; onValueChange: (agent: TuiAgent) => void }

export type CustomAgentComboboxEntry = {
  id: string
  label: string
  cmd: string
  baseAgent: TuiAgent
}

type AgentComboboxProps = AgentComboboxSelectionProps & {
  blankLabel?: string
  disabled?: boolean
  agents: AgentCatalogEntry[]
  value: TuiAgent | null
  customAgents?: readonly CustomAgentComboboxEntry[]
  customValue?: string | null
  onCustomValueChange?: (profileId: string | null) => void
  onOpenManageAgents?: () => void
  /** Saved default used for list indicators and right-click default actions. */
  defaultAgent?: DefaultAgentPreference
  /** Enable default-setting context menus on the selected trigger and list items. */
  onSetDefault?: (agent: DefaultAgentPreference) => void
  triggerClassName?: string
  /** Let the parent submit on Enter from the closed trigger instead of opening the picker. */
  onTriggerEnter?: () => void
  allowNarrowTrigger?: boolean
  /** Clearing is separate from selecting Blank Terminal. */
  clearSelection?: {
    cleared: boolean
    onClear: () => void
  }
  /** Lists the "+" menu's chat and CLI rows instead of `agents`; picks go to `onPick`. */
  surfaceRows?: AgentComboboxSurfaceRows
}

const BLANK_VALUE = '__none__'
const CUSTOM_VALUE_PREFIX = '__custom__:'
const TRIGGER_MIN_WIDTH_CLASS = '!min-w-[260px]'
const NO_CUSTOM_AGENTS: readonly CustomAgentComboboxEntry[] = []

export default function AgentCombobox({
  agents,
  blankLabel,
  disabled,
  value,
  customAgents = NO_CUSTOM_AGENTS,
  customValue = null,
  onCustomValueChange,
  onOpenManageAgents,
  defaultAgent,
  onSetDefault,
  triggerClassName,
  onTriggerEnter,
  allowNarrowTrigger = false,
  clearSelection,
  surfaceRows,
  ...selection
}: AgentComboboxProps): React.JSX.Element {
  const blankText =
    blankLabel ?? translate('auto.components.agent.AgentCombobox.986f946354', 'Blank Terminal')
  const allowBlankTerminal = selection.allowBlankTerminal === true
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Control cmdk selection so hovering the external footer clears the last highlighted agent.
  const [commandState, setCommandState] = useState(() => state.createAgentComboboxCommandState(''))
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const focusFrameRef = React.useRef<number | null>(null)

  const selectedAgent = useMemo<AgentCatalogEntry | null>(
    () => (!customValue && value ? (agents.find((agent) => agent.id === value) ?? null) : null),
    [agents, customValue, value]
  )
  const selectedCustomAgent = useMemo(
    () => customAgents.find((agent) => agent.id === customValue) ?? null,
    [customAgents, customValue]
  )
  const selectionCleared = clearSelection?.cleared === true
  const selectedDefaultPreference = customValue
    ? null
    : selectionCleared
      ? null
      : (value ?? (allowBlankTerminal ? 'blank' : null))
  const canClear = clearSelection !== undefined && !selectionCleared
  const searchableAgents = useMemo(
    () => [
      ...agents.map((agent) => ({ ...agent, baseAgent: agent.id, profileId: null })),
      ...customAgents.map((agent) => ({
        ...agent,
        id: `${CUSTOM_VALUE_PREFIX}${agent.id}`,
        profileId: agent.id
      }))
    ],
    [agents, customAgents]
  )
  const filteredAgents = useMemo(
    () => searchAgentPickerEntries(searchableAgents, query),
    [query, searchableAgents]
  )
  const pickerValue = customValue ? `${CUSTOM_VALUE_PREFIX}${customValue}` : value
  const blankMatchesQuery = useMemo(
    () => allowBlankTerminal && agentPickerBlankTerminalMatches(query),
    [allowBlankTerminal, query]
  )
  const pickerValues = { agents, query, value, blankValue: BLANK_VALUE, blankMatchesQuery }
  const surface = surfaceRows ? surfaceCommandValues(surfaceRows.model, pickerValues) : null
  const surfaceList = surface?.rows ?? []
  const openCommandValue = selectionCleared
    ? ''
    : ((surface ? surface.selected : pickerValue) ?? BLANK_VALUE)
  const pickedCommandValue = surface
    ? surface.highlighted
    : getAgentPickerCommandValue({
        ...pickerValues,
        currentValue: pickerValue,
        filteredAgents,
        rawQuery: query
      })
  const activeCommandValue = selectionCleared && !query ? '' : pickedCommandValue
  const resolvedCommandState = state.resolveAgentComboboxCommandState(
    commandState,
    open && !disabled,
    activeCommandValue
  )
  if (resolvedCommandState !== commandState) {
    // Reconcile query/results before paint without replacing manual hover until the candidate changes.
    setCommandState(resolvedCommandState)
  }
  if (disabled && open) {
    setOpen(false)
    setQuery('')
  }
  const commandValue = resolvedCommandState.commandValue

  const cancelFocusFrame = useCallback((): void => {
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current)
      focusFrameRef.current = null
    }
  }, [])

  const setInputNode = useCallback(
    (node: HTMLInputElement | null): void => {
      if (node === null) {
        cancelFocusFrame()
      }
      inputRef.current = node
    },
    [cancelFocusFrame]
  )

  const setCommandValue = useCallback((nextCommandValue: string): void => {
    setCommandState((current) => state.updateAgentComboboxCommandValue(current, nextCommandValue))
  }, [])

  const focusSearchInput = useCallback(() => {
    cancelFocusFrame()
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null
      const searchInput = inputRef.current
      if (!searchInput) {
        return
      }
      searchInput.focus()
      // Append after the key that seeded search instead of selecting and replacing it.
      const end = searchInput.value.length
      searchInput.setSelectionRange(end, end)
    })
  }, [cancelFocusFrame])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen && !disabled)
      if (nextOpen && !disabled) {
        setCommandState(state.createAgentComboboxCommandState(openCommandValue))
        return
      }
      cancelFocusFrame()
      setQuery('')
    },
    [cancelFocusFrame, disabled, openCommandValue]
  )

  const closePicker = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const handleSurfacePick: AgentComboboxSurfaceRows['onPick'] = (agent, surface) => {
    surfaceRows?.onPick(agent, surface)
    closePicker()
  }
  const arming = useSurfaceRowArming(surfaceList, commandValue, handleSurfacePick, {
    key: JSON.stringify([open, query, surfaceRows?.contextKey]),
    model: surfaceRows?.model
  })
  const picksCli = surfaceRows?.selection.cli === true

  const clearCustomValue = (): void => {
    if (customValue) {
      onCustomValueChange?.(null)
    }
  }

  const handleSelectAgent = (nextValue: TuiAgent): void => {
    clearCustomValue()
    selection.onValueChange(nextValue)
    closePicker()
  }

  const handleSelectBlank = (): void => {
    if (selection.allowBlankTerminal) {
      clearCustomValue()
      selection.onValueChange(null)
    }
    closePicker()
  }

  const handleSelectCustom = (profileId: string): void => {
    onCustomValueChange?.(profileId)
    closePicker()
  }

  // Match RepoCombobox: plain focus confirms the selection; arrows open unfiltered, printable non-whitespace keys open and seed a new query.
  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled || open) {
        return
      }
      if (
        event.key === 'Enter' &&
        onTriggerEnter &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault()
        onTriggerEnter()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setCommandState(state.createAgentComboboxCommandState(openCommandValue))
        setOpen(true)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (event.key.length === 1 && /\S/.test(event.key)) {
        event.preventDefault()
        setCommandState(state.createAgentComboboxCommandState(openCommandValue))
        setQuery(event.key)
        setOpen(true)
      }
    },
    [disabled, open, onTriggerEnter, openCommandValue]
  )

  return (
    // Allow full-width form rows to shrink within their dialog column.
    <div className="relative min-w-0 w-full">
      <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
        <AgentDefaultContextMenu
          isDefault={
            selectedDefaultPreference !== null && defaultAgent === selectedDefaultPreference
          }
          onSetDefault={
            onSetDefault && selectedDefaultPreference !== null
              ? () => onSetDefault(selectedDefaultPreference)
              : undefined
          }
        >
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              onKeyDown={handleTriggerKeyDown}
              // Why: the "(CLI)" suffix depends on the host's answer; it never pops in on a settled field.
              disabled={disabled || (surfaceRows?.selection.ready === false && value !== null)}
              className={cn(
                // Retain room for long labels; py-0 clears default vertical padding to center content in h-8/h-9.
                'h-8 justify-between px-3 py-0 text-xs font-normal',
                triggerClassName,
                !allowNarrowTrigger && TRIGGER_MIN_WIDTH_CLASS
              )}
              data-agent-combobox-root="true"
            >
              <AgentComboboxTriggerContent
                canClear={canClear}
                selectionCleared={selectionCleared}
                selectedCustomAgent={selectedCustomAgent}
                selectedAgent={selectedAgent}
                picksCli={picksCli}
                allowBlankTerminal={allowBlankTerminal}
                blankText={blankText}
              />
            </Button>
          </PopoverTrigger>
        </AgentDefaultContextMenu>
        <PopoverContent
          align="start"
          className={cn(
            'w-[var(--radix-popover-trigger-width)] p-0',
            !allowNarrowTrigger && 'min-w-[18rem]'
          )}
          data-agent-combobox-root="true"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            focusSearchInput()
          }}
        >
          <Command
            shouldFilter={false}
            value={commandValue}
            onValueChange={setCommandValue}
            onKeyDown={surfaceRows ? arming.onKeyDown : undefined}
          >
            <CommandInput
              ref={setInputNode}
              placeholder={translate(
                'auto.components.agent.AgentCombobox.48c6a5a9b4',
                'Search agents...'
              )}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {translate(
                  'auto.components.agent.AgentCombobox.579c768bde',
                  'No agents match your search.'
                )}
              </CommandEmpty>
              <AgentComboboxSearchItems
                blankMatchesQuery={blankMatchesQuery}
                blankValue={BLANK_VALUE}
                blankText={blankText}
                value={value}
                selectionCleared={selectionCleared}
                defaultAgent={defaultAgent}
                onSetDefault={onSetDefault}
                onSelectBlank={handleSelectBlank}
                agents={surfaceRows ? [] : filteredAgents}
                customValue={customValue}
                onSelectAgent={handleSelectAgent}
                onSelectCustom={handleSelectCustom}
                surfaceItems={
                  surfaceRows ? (
                    <SurfaceAgentItems
                      surfaceRows={{ ...surfaceRows, onPick: handleSurfacePick }}
                      rows={surfaceList}
                      value={value}
                      armedValue={arming.armedValue}
                      defaultAgent={defaultAgent}
                      onSetDefault={onSetDefault}
                    />
                  ) : null
                }
              />
            </CommandList>
            {onOpenManageAgents ? (
              <div className="border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenManageAgents}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setCommandValue('')}
                  className="h-9 w-full justify-start rounded-none px-3 text-xs font-normal text-muted-foreground"
                >
                  {translate('auto.components.agent.AgentCombobox.19522e25ee', 'Manage agents')}
                  <ArrowRight className="ml-auto size-3" />
                </Button>
              </div>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>
      {canClear && (
        <AgentComboboxClearButton
          disabled={disabled}
          onClear={() => {
            clearSelection.onClear()
            closePicker()
            triggerRef.current?.focus()
          }}
        />
      )}
    </div>
  )
}
