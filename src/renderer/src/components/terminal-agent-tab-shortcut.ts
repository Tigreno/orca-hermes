import type { KeybindingActionId, KeybindingOverrides } from '../../../shared/keybindings'
import type { TuiAgent } from '../../../shared/tui-agent'
import { useAppStore } from '../store'
import { readDetectedAgentsForWorktree } from '@/lib/agent-detection-target-inventory'
import { readAgentLaunchPreferencesForWorktree } from '@/components/settings/use-host-agent-launch-preferences'
import {
  listBoundAgentTabActions,
  resolveDefaultAgentForNewTab,
  resolveDefaultAgentForWorktreeNewTab
} from '@/lib/agent-tab-shortcuts'
import { chosenAgentChatUnlearned } from '@/lib/host-chat-program'
import { worktreeLaunchWorkspace } from '@/lib/agent-launch-route-input'
import { getDefaultCustomAgentProfile } from '../../../shared/custom-agent-profile'

export type TerminalAgentTabShortcut = {
  actionId: KeybindingActionId | null
  agent: TuiAgent | null
  customAgentProfileId: string | null
  /** Set when the cached list has no usable agent; settles once the workspace's host answers. */
  pendingAgent?: Promise<TuiAgent | null>
}

export function readAgentTabShortcutActions(
  activeWorktreeId: string,
  keybindings: KeybindingOverrides
) {
  const state = useAppStore.getState()
  const preferences = readAgentLaunchPreferencesForWorktree(state, activeWorktreeId)
  return [
    { actionId: 'tab.newTerminal' as const, agent: null },
    {
      actionId: 'tab.newAgent' as const,
      get agent() {
        const detectedAgentIds = readDetectedAgentsForWorktree(state, activeWorktreeId)
        const agent = resolveDefaultAgentForNewTab({
          ...preferences,
          detectedAgentIds,
          chatIn: { store: state, worktreeId: activeWorktreeId }
        })
        return agent &&
          !chosenAgentChatUnlearned(
            state,
            preferences.defaultTuiAgent,
            detectedAgentIds,
            worktreeLaunchWorkspace(activeWorktreeId)
          )
          ? agent
          : null
      }
    },
    ...listBoundAgentTabActions(keybindings, preferences.disabledTuiAgents)
  ]
}

export function resolveAgentTabShortcutAction(
  actions: ReturnType<typeof readAgentTabShortcutActions>,
  matchShortcut: (actionId: KeybindingActionId) => boolean
) {
  return actions.find(({ actionId }) => matchShortcut(actionId))
}

export function resolveTerminalAgentTabShortcut({
  activeWorktreeId,
  keybindings,
  matchShortcut,
  includeTerminal = false
}: {
  activeWorktreeId: string
  keybindings: KeybindingOverrides
  matchShortcut: (actionId: KeybindingActionId) => boolean
  includeTerminal?: boolean
}): TerminalAgentTabShortcut {
  const state = useAppStore.getState()
  const action = resolveAgentTabShortcutAction(
    readAgentTabShortcutActions(activeWorktreeId, keybindings),
    (actionId) => (includeTerminal || actionId !== 'tab.newTerminal') && matchShortcut(actionId)
  )
  if (!action) {
    return { actionId: null, agent: null, customAgentProfileId: null }
  }
  const { actionId, agent } = action
  if (actionId === 'tab.newAgent') {
    const customAgent = getDefaultCustomAgentProfile(state.settings?.customAgentProfiles)
    if (customAgent) {
      return { actionId, agent: null, customAgentProfileId: customAgent.id }
    }
  }
  return actionId === 'tab.newAgent' && !agent
    ? {
        actionId,
        agent,
        customAgentProfileId: null,
        pendingAgent: resolveDefaultAgentForWorktreeNewTab(useAppStore.getState, activeWorktreeId)
      }
    : { actionId, agent, customAgentProfileId: null }
}
