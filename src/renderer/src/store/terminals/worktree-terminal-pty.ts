import type { AppState } from '../types'
import { resolvePrimaryLayoutPtyId } from './pty/terminal-pty-identities'

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
  const livePtyIds = state.ptyIdsByTabId[tabId] ?? []
  if (livePtyIds.length === 0) {
    return null
  }
  const layout = state.terminalLayoutsByTabId[tabId]
  const primaryPtyId = layout ? resolvePrimaryLayoutPtyId(layout) : null
  if (primaryPtyId && livePtyIds.includes(primaryPtyId)) {
    return primaryPtyId
  }
  const liveLayoutPtyId = Object.values(layout?.ptyIdsByLeafId ?? {}).find((ptyId) =>
    livePtyIds.includes(ptyId)
  )
  return liveLayoutPtyId ?? livePtyIds.at(-1) ?? null
}
