import { SquareTerminal } from 'lucide-react'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import { DropdownMenuItem, DropdownMenuShortcut } from '@/components/ui/dropdown-menu'
import type { AgentPickerMenuLaunch } from '@/components/agent/AgentLaunchPickerMenuRow'
import type { NewTabAgentMenuRow } from '../../../../shared/agent-launch/picker/agent-launch-picker-rows'
import { rowTitle } from './tab-agent-row-presentation'

export function CustomAgentMenuItem({
  row,
  disabled,
  runLaunch,
  shortcut
}: {
  row: Extract<NewTabAgentMenuRow, { kind: 'custom' }>
  disabled: boolean
  runLaunch: AgentPickerMenuLaunch
  shortcut: string | null
}): React.JSX.Element {
  return (
    <DropdownMenuItem
      variant="launch"
      disabled={disabled}
      onSelect={() => runLaunch(row)}
      title={rowTitle(row, row.profile.name)}
    >
      {row.profile.baseAgent ? (
        <AgentIcon agent={row.profile.baseAgent} size={14} />
      ) : (
        <SquareTerminal className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="flex-1">{row.profile.name}</span>
      {row.isDefault && shortcut !== null ? (
        <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
      ) : null}
    </DropdownMenuItem>
  )
}
