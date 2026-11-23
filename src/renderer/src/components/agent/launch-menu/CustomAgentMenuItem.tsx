import type { ComponentProps } from 'react'
import { SquareTerminal } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuShortcut } from '@/components/ui/dropdown-menu'
import { AgentIcon } from '@/components/agent/icons/AgentIcon'
import type { AgentMenuRow } from '../../../../../shared/agent-launch/picker/agent-launch-picker-rows'
import type { SubscribedAgentLaunchPickerMenu } from '../AgentLaunchPickerMenu'
import { rowTitle } from './agent-menu-row-presentation'

/** A custom profile has no built-in agent identity, so it renders outside the picker inventory. */
export function CustomAgentMenuItem({
  row,
  disabled,
  runLaunch,
  shortcut
}: {
  row: Extract<AgentMenuRow, { kind: 'custom' }>
  disabled: boolean
  runLaunch: ComponentProps<typeof SubscribedAgentLaunchPickerMenu>['runLaunch']
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
