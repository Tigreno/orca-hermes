import { expect, it } from 'vitest'
import type { AgentStatusEntry } from '../../../../../../shared/agent-status/contracts/agent-status-types'
import type { ExecutionHostId } from '../../../../../../shared/execution-host/execution-host'
import {
  structuredAgentSessionPaneKey,
  structuredAgentSessionTabId
} from '../../../../../../shared/agent-session/view/structured-agent-session-projection'
import { toRemoteRuntimePtyId } from '../../../../../../shared/remote-runtime/remote-runtime-pty-id'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { getAgentPaneExecutionHost } from './agent-pane-execution-host'

const sessionId = 'server-session'
const tabId = structuredAgentSessionTabId(sessionId)
const paneKey = structuredAgentSessionPaneKey(tabId, sessionId)
const legacyPaneKey = 'tab:11111111-1111-4111-8111-111111111111'

function stateWithWorktreeHost(hostId: ExecutionHostId) {
  return {
    unifiedTabsByWorktree: {},
    terminalLayoutsByTabId: {},
    ptyIdsByTabId: {},
    worktreesByRepo: {
      repo: [makeWorktree({ id: 'workspace', repoId: 'repo', hostId })]
    }
  }
}

function entryWith(overrides: Partial<AgentStatusEntry> = {}): AgentStatusEntry {
  return {
    paneKey,
    tabId,
    worktreeId: 'workspace',
    state: 'working',
    agentType: 'claude',
    prompt: '',
    updatedAt: 1,
    stateStartedAt: 1,
    stateHistory: [],
    ...overrides
  }
}

it('attributes a structured row from its worktree before its chat tab arrives', () => {
  const entry = entryWith({ connectionId: null })

  expect(
    getAgentPaneExecutionHost(stateWithWorktreeHost('runtime:server-env'), paneKey, entry)
  ).toBe('runtime:server-env')
})

it('keeps a structured runtime row whose terminal handle is hostless', () => {
  const entry = entryWith({ connectionId: null, terminalHandle: 'server-pty' })

  expect(
    getAgentPaneExecutionHost(
      stateWithWorktreeHost('runtime:server-env'),
      paneKey,
      entry,
      toRemoteRuntimePtyId('server-pty', 'server-env')
    )
  ).toBe('runtime:server-env')
})

it('attributes a PTY-less mirrored row from its stamped runtime host', () => {
  const entry = {
    ...entryWith({ connectionId: null, terminalHandle: 'server-pty' }),
    paneKey: legacyPaneKey,
    tabId: undefined
  }

  expect(
    getAgentPaneExecutionHost(
      stateWithWorktreeHost('runtime:server-env'),
      legacyPaneKey,
      entry,
      toRemoteRuntimePtyId('server-pty', 'server-env'),
      'runtime:server-env'
    )
  ).toBe('runtime:server-env')
})

it.each([null, 'server-env'])(
  'keeps PTY-less mirrored runtime status on its stamped host (%s)',
  (connectionId) => {
    const entry = {
      ...entryWith({ connectionId }),
      paneKey: legacyPaneKey,
      tabId: undefined
    }

    expect(
      getAgentPaneExecutionHost(
        stateWithWorktreeHost('runtime:server-env'),
        legacyPaneKey,
        entry,
        undefined,
        'runtime:server-env'
      )
    ).toBe('runtime:server-env')
  }
)

it('does not turn PTY-less local status into a remote row', () => {
  const entry = entryWith({ connectionId: null })

  expect(
    getAgentPaneExecutionHost(stateWithWorktreeHost('local'), paneKey, entry, undefined, 'local')
  ).toBe('local')
})
