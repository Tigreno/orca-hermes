import type { AppState } from '../../../types'
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import {
  getConnectionExecutionHostId,
  parseExecutionHostId
} from '../../../../../../shared/execution-host/execution-host'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import { getPtyExecutionHost } from '../../../../../../shared/terminal/pty/lifecycle/terminal-execution-host'
import { parsePaneKey } from '../../../../../../shared/workspace-layout/stable-pane-id'
import { getStructuredAgentSessionTabsByPaneKey } from '@/components/native-chat/session/status/structured-agent-session-tabs'
import {
  resolveStructuredAgentSessionOwner,
  structuredAgentSessionOwnerForTab
} from '@/runtime/native-chat/session-ownership/structured-agent-session-owner'
import { structuredAgentSessionIdOfTab } from '../../../../../../shared/agent-session/view/structured-agent-session-tab'
import type { WorktreeRuntimeOwnerState } from '@/lib/workspace/ownership/worktree-runtime-owner-state'

function isStructuredStatusPaneKey(paneKey: string): boolean {
  const tabId = parsePaneKey(paneKey)?.tabId
  return Boolean(tabId && structuredAgentSessionIdOfTab(tabId))
}

/** Resolve the same pane owner for sidebar rows and explicit workspace reads. */
export function getAgentPaneExecutionHost(
  state: Pick<AppState, 'unifiedTabsByWorktree' | 'terminalLayoutsByTabId' | 'ptyIdsByTabId'> &
    WorktreeRuntimeOwnerState,
  paneKey: string,
  entry: AgentStatusEntry | undefined,
  fallbackPtyId?: string | null,
  fallbackHostId?: ExecutionHostId
) {
  const tab = getStructuredAgentSessionTabsByPaneKey(state.unifiedTabsByWorktree).get(paneKey)
  if (tab) {
    return structuredAgentSessionOwnerForTab(state, tab)
  }
  if (isStructuredStatusPaneKey(paneKey) && entry?.worktreeId) {
    const worktreeOwner = resolveStructuredAgentSessionOwner(state, entry.worktreeId)
    if (worktreeOwner) {
      return worktreeOwner
    }
  }
  const parsed = parsePaneKey(paneKey)
  const ptyId =
    (parsed && state.terminalLayoutsByTabId[parsed.tabId]?.ptyIdsByLeafId?.[parsed.leafId]) ??
    entry?.terminalHandle ??
    fallbackPtyId ??
    (parsed ? state.ptyIdsByTabId[parsed.tabId]?.[0] : undefined)
  const ptyHost = getPtyExecutionHost(ptyId)
  if (ptyHost) {
    return ptyHost
  }
  if (fallbackHostId) {
    const runtimeOwner = parseExecutionHostId(fallbackHostId)
    if (
      runtimeOwner?.kind === 'runtime' &&
      (entry?.connectionId == null || runtimeOwner.environmentId === entry.connectionId)
    ) {
      return fallbackHostId
    }
  }
  if (!ptyId && entry?.connectionId === undefined && fallbackHostId) {
    return fallbackHostId
  }
  return getConnectionExecutionHostId(entry?.connectionId)
}
