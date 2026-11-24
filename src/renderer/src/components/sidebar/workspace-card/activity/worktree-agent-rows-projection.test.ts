import { expect, it } from 'vitest'
import {
  structuredAgentSessionPaneKey,
  structuredAgentSessionTabId
} from '../../../../../../shared/agent-session/view/structured-agent-session-projection'
import { createTestStore, seedStore } from '@/store/testing/app-store-test-fixture'
import { makeWorktree } from '@/store/slices/worktrees/worktree.test-fixture'
import { createWorktreeAgentRowsSelector } from './worktree-agent-rows-projection'

const TIMESTAMP = 1_000

it('keeps structured server status visible before its chat tab arrives', () => {
  const store = createTestStore()
  const sessionId = 'server-session'
  const tabId = structuredAgentSessionTabId(sessionId)
  const paneKey = structuredAgentSessionPaneKey(tabId, sessionId)
  seedStore(store, {
    worktreesByRepo: {
      repo: [makeWorktree({ id: 'workspace', repoId: 'repo', hostId: 'runtime:server-env' })]
    }
  })
  store.getState().setAgentStatus(
    paneKey,
    {
      state: 'working',
      prompt: 'Working',
      agentType: 'claude'
    },
    undefined,
    { updatedAt: TIMESTAMP, stateStartedAt: TIMESTAMP },
    { tabId, worktreeId: 'workspace', connectionId: null }
  )

  const state = store.getState()
  expect(
    createWorktreeAgentRowsSelector(
      'workspace',
      'runtime:server-env'
    )(state).map((row) => row.paneKey)
  ).toEqual([paneKey])
  expect(createWorktreeAgentRowsSelector('workspace', 'local')(state)).toEqual([])
})
