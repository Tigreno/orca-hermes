import type { AppState } from '../types'
import { resolveLiveTerminalPtyId } from './terminal-pty-identities'

type WorktreeTerminalPtyState = Pick<
  AppState,
  | 'activeWorktreeId'
  | 'activeTabId'
  | 'activeTabIdByWorktree'
  | 'tabsByWorktree'
  | 'ptyIdsByTabId'
  | 'terminalLayoutsByTabId'
>

export function resolveWorktreeTerminalPtyId(
  state: WorktreeTerminalPtyState,
  worktreeId: string | null = state.activeWorktreeId
): string | null {
  if (!worktreeId) {
    return null
  }
  const tabId =
    state.activeTabIdByWorktree[worktreeId] ??
    (state.activeWorktreeId === worktreeId ? state.activeTabId : null)
  if (!tabId || !(state.tabsByWorktree[worktreeId] ?? []).some((tab) => tab.id === tabId)) {
    return null
  }
  return resolveLiveTerminalPtyId(state.ptyIdsByTabId, state.terminalLayoutsByTabId, tabId)
}
