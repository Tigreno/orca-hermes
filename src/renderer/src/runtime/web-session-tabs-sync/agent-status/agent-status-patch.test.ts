import { expect, it } from 'vitest'
import type { AgentStatusEntry } from '../../../../../shared/agent-status/contracts/agent-status-types'
import { AGENT_STATUS_STALE_AFTER_MS } from '../../../../../shared/agent-status/contracts/agent-status-freshness'
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import { acceptedAgentStatuses } from '@/store/slices/agent-status/status-ownership/accepted-agent-statuses'
import { createAgentStatusTransactionOwner } from '@/store/slices/agent-status/status-ownership/agent-status-transaction-owner'
import { makeTab } from '@/store/terminals/testing/terminal-tab.test-fixture'
import { ENV, NOW, WT } from '../testing/web-session-tabs-sync.test-fixture'
import { buildMirroredAgentStatusPatch } from './agent-status-patch'

const TAB_ID = 'web-terminal-1'
const PANE_KEY = `${TAB_ID}:11111111-1111-4111-8111-111111111111`

function entryWith(mirroredEvidenceReceivedAt: number): AgentStatusEntry {
  return {
    paneKey: PANE_KEY,
    tabId: TAB_ID,
    worktreeId: WT,
    connectionId: ENV,
    state: 'done',
    agentType: 'hermes',
    prompt: '',
    updatedAt: NOW - 1_000,
    stateStartedAt: NOW - 5_000,
    stateHistory: [],
    mirroredEvidenceReceivedAt,
    terminalHandle: 'term-1'
  }
}

function stateWith(entry: AgentStatusEntry): AppState {
  const initial = useAppStore.getInitialState()
  const tab = makeTab({ id: TAB_ID, worktreeId: WT })
  const next: AppState = {
    ...initial,
    tabsByWorktree: { [WT]: [tab] },
    agentStatusByPaneKey: acceptedAgentStatuses().replace([[PANE_KEY, entry]])
  }
  const transaction = createAgentStatusTransactionOwner()
  transaction.stage(initial, next)
  transaction.commit()
  return next
}

function patchFor(entry: AgentStatusEntry) {
  const state = stateWith(entry)
  const tab = state.tabsByWorktree[WT][0]
  return buildMirroredAgentStatusPatch(state, [tab], [], [], ENV, WT, new Set(), NOW)
}

it('retains a fresh mirrored agent row when a host graph frame omits it', () => {
  expect(patchFor(entryWith(NOW - 500))).toBeNull()
})

it('lets a stale mirrored agent row decay when a host graph frame omits it', () => {
  const patch = patchFor(entryWith(NOW - AGENT_STATUS_STALE_AFTER_MS - 1))
  expect(patch?.agentStatusByPaneKey.get(PANE_KEY)).toBeUndefined()
})
