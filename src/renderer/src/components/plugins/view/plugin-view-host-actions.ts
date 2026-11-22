import type {
  PluginViewReply,
  PluginViewRequest
} from '../../../../../shared/plugins/view/plugin-view-protocol'
import { detectLanguage } from '../../../../../shared/editor-language/editor-language-detect'
import { dispatchAppCommand } from '@/lib/app-commands/app-command-dispatch'
import { sendAgentDraftPasteContent } from '@/lib/agent-session/messaging/paste/agent-draft-paste-content'
import { focusTerminalTabSurface } from '@/components/terminal-pane/input/focus/focus-terminal-tab-surface'
import { useAppStore } from '@/store'
import { resolveWorktreeTerminalPtyId } from '@/store/terminals/worktree-terminal-pty'
import { getIndexedWorktreeMap } from '@/store/slices/worktrees/listing/worktree-catalog-index'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import { parseWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'

/** A plugin worker's `editor.open` and `commands.run`, run in this window. */

const fail = (requestId: string, code: string, message: string): PluginViewReply => ({
  requestId,
  ok: false,
  code,
  message
})

/** The workspace path and a relative one joined with the workspace's own separator. */
function workspaceFilePath(worktreePath: string, relativePath: string): string {
  const separator = worktreePath.includes('\\') && !worktreePath.includes('/') ? '\\' : '/'
  const parts = relativePath.split(/[\\/]/).filter((part) => part !== '' && part !== '.')
  return [worktreePath.replace(/[\\/]+$/, ''), ...parts].join(separator)
}

/** A `workspace.list` id (a worktree id, its host-naming `identity:` key, or a folder key) as
 *  this window's workspace id and folder path. */
function resolveWorkspace(workspaceId: string): { id: string; root: string } | null {
  const state = useAppStore.getState()
  const scope = parseWorkspaceKey(workspaceId)
  if (scope?.type === 'folder') {
    const folder = selectFolderWorkspaces(state)?.find(
      (entry) => entry.id === scope.folderWorkspaceId
    )
    return folder ? { id: workspaceId, root: folder.folderPath } : null
  }
  const worktrees = selectWorktreesByRepo(state)
  const identity = workspaceId.startsWith('identity:') ? workspaceId.slice(9) : null
  const worktree = identity
    ? Object.values(worktrees)
        .flat()
        .find((entry) => entry.identity?.key === identity)
    : getIndexedWorktreeMap(worktrees).get(workspaceId)
  return worktree ? { id: worktree.id, root: worktree.path } : null
}

export function openWorkspaceFile(
  request: Extract<PluginViewRequest, { kind: 'open-file' }>
): PluginViewReply {
  const { requestId, worktreeId, relativePath } = request
  const workspace = resolveWorkspace(worktreeId)
  if (!workspace) {
    return fail(requestId, 'workspace_not_found', `This window does not list ${worktreeId}.`)
  }
  const filePath = workspaceFilePath(workspace.root, relativePath)
  useAppStore.getState().openFile(
    {
      filePath,
      relativePath: relativePath.split(/[\\/]/).filter(Boolean).join('/'),
      worktreeId: workspace.id,
      language: detectLanguage(filePath),
      mode: 'edit'
    },
    { preview: false }
  )
  return { requestId, ok: true }
}

/** `workspace.open` of a folder workspace: the runtime activates Git worktrees only. */
export function openFolderWorkspace(
  request: Extract<PluginViewRequest, { kind: 'open-folder-workspace' }>
): PluginViewReply {
  const { requestId, folderWorkspaceId } = request
  const state = useAppStore.getState()
  if (!selectFolderWorkspaces(state)?.some((folder) => folder.id === folderWorkspaceId)) {
    return fail(requestId, 'workspace_not_found', `This window does not list that folder.`)
  }
  state.setActiveFolderWorkspace(folderWorkspaceId)
  return { requestId, ok: true }
}

// Rule: the raw built-in handler, never a wrapper that runs a plugin's replacement first, or a
// replacement that calls commands.run for Orca's own version would call itself.
export function runBuiltInAction(
  request: Extract<PluginViewRequest, { kind: 'run-action' }>
): PluginViewReply {
  return dispatchAppCommand(request.action, 'plugin-host')
    ? { requestId: request.requestId, ok: true }
    : fail(request.requestId, 'action_unavailable', `${request.action} cannot run in this view.`)
}

/** Insert into the active agent input and focus it (Bitrix24 "send to terminal" parity). */
export async function insertAgentDraft(
  request: Extract<PluginViewRequest, { kind: 'insert-agent-draft' }>
): Promise<PluginViewReply> {
  const { requestId, text } = request
  const ptyId = resolveWorktreeTerminalPtyId(useAppStore.getState())
  if (!ptyId) {
    return fail(
      requestId,
      'no_terminal',
      'No active agent input is available. Open an agent terminal in the active workspace, or focus a terminal-backed agent.'
    )
  }
  try {
    const accepted = await sendAgentDraftPasteContent(ptyId, text, 'driving')
    if (!accepted) {
      return fail(requestId, 'rejected', 'Could not insert text into the active agent input.')
    }
  } catch {
    return fail(requestId, 'rejected', 'Could not insert text into the active agent input.')
  }

  const state = useAppStore.getState()
  if (state.activeView === 'tasks') {
    state.closeTaskPage()
  }
  const next = useAppStore.getState()
  if (next.activeView !== 'terminal') {
    next.setActiveView('terminal')
  }
  const worktreeId = next.activeWorktreeId
  const tabId = worktreeId
    ? (next.activeTabIdByWorktree[worktreeId] ?? next.activeTabId)
    : next.activeTabId
  if (worktreeId && tabId) {
    next.setActiveTabType('terminal', worktreeId)
    focusTerminalTabSurface(tabId, next.terminalLayoutsByTabId[tabId]?.activeLeafId ?? null)
  }
  return { requestId, ok: true }
}
