import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentCatalogEntry } from '@/lib/agent-catalog'
import type { launchCustomAgentInNewTab as LaunchCustomAgentInNewTab } from './launch-custom-agent-in-new-tab'

const mocks = vi.hoisted(() => ({
  createTab: vi.fn(),
  getAgentLaunchPlatformForRepo: vi.fn((): NodeJS.Platform => 'linux'),
  nodePlatformFromProjectRuntime: vi.fn((): NodeJS.Platform | undefined => undefined),
  getExecutionHostIdForWorktree: vi.fn(),
  getRuntimeEnvironmentIdForWorktree: vi.fn(),
  launchAgentInNewTab: vi.fn(),
  queueTabStartupCommand: vi.fn(),
  resolveAgentLaunchExecutionContext: vi.fn(),
  setActiveTabType: vi.fn(),
  setTabBarOrder: vi.fn(),
  toastError: vi.fn()
}))

const codexLunaProfile = {
  id: 'codex-luna',
  name: 'Codex Luna',
  baseAgent: 'codex' as const,
  baseAgentExecutable: 'codex',
  executable: 'codex',
  args: ['--model', 'luna']
}
const genericProfile = {
  id: 'dhimanex',
  name: 'Dhimanex',
  executable: 'dhimanex',
  args: ['--fast']
}
const repointedProfile = {
  id: 'repointed',
  name: 'Repointed',
  baseAgent: 'codex' as const,
  baseAgentExecutable: 'codex',
  executable: 'claude',
  args: []
}
const disabledProfile = {
  id: 'disabled',
  name: 'Disabled',
  executable: 'disabled',
  args: [],
  enabled: false
}

const store = {
  settings: {
    terminalWindowsShell: 'powershell.exe',
    customAgentProfiles: [codexLunaProfile, genericProfile, repointedProfile, disabledProfile]
  },
  sshConnectionStates: new Map(),
  sshStateByEnvironment: new Map(),
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: widens the literal so tests can set an SSH connection id.
  repos: [{ id: 'repo-1', connectionId: null as string | null, path: '/repo' }],
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: widens the empty literal to the folder workspace shape tests populate.
  folderWorkspaces: [] as { id: string; folderPath: string }[],
  worktreesByRepo: {},
  allWorktrees: vi.fn(() => [{ id: 'wt-1', repoId: 'repo-1' }]),
  tabsByWorktree: { 'wt-1': [{ id: 'tab-1' }] },
  openFiles: [],
  browserTabsByWorktree: {},
  tabBarOrderByWorktree: {},
  createTab: mocks.createTab,
  queueTabStartupCommand: mocks.queueTabStartupCommand,
  setActiveTabType: mocks.setActiveTabType,
  setTabBarOrder: mocks.setTabBarOrder
}

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the launcher reads only `id` and `cmd` off a catalog entry.
const catalog = [
  { id: 'codex', cmd: 'codex' },
  { id: 'claude', cmd: 'claude' },
  { id: 'hermes', cmd: 'hermes' }
] as AgentCatalogEntry[]

vi.mock('@/store', () => ({ useAppStore: { getState: () => store } }))
vi.mock('@/lib/agent-catalog', () => ({ getAgentCatalog: () => catalog }))
vi.mock('@/lib/agent-launch-platform', () => ({
  getAgentLaunchPlatformForRepo: mocks.getAgentLaunchPlatformForRepo,
  nodePlatformFromProjectRuntime: mocks.nodePlatformFromProjectRuntime
}))
vi.mock('@/lib/launch-agent-in-new-tab', () => ({
  launchAgentInNewTab: mocks.launchAgentInNewTab
}))
vi.mock('@/lib/launch-agent-execution-context', () => ({
  resolveAgentLaunchExecutionContext: mocks.resolveAgentLaunchExecutionContext
}))
vi.mock('@/lib/new-workspace', () => ({ CLIENT_PLATFORM: 'win32' }))
vi.mock('@/lib/worktree-runtime-owner', () => ({
  getExecutionHostIdForWorktree: mocks.getExecutionHostIdForWorktree,
  getRuntimeEnvironmentIdForWorktree: mocks.getRuntimeEnvironmentIdForWorktree
}))
vi.mock('@/components/tab-bar/reconcile-order', () => ({
  reconcileTabOrder: vi.fn(() => ['tab-1'])
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

let launchCustomAgentInNewTab: typeof LaunchCustomAgentInNewTab

describe('launchCustomAgentInNewTab', () => {
  beforeAll(async () => {
    const module = await import('./launch-custom-agent-in-new-tab')
    launchCustomAgentInNewTab = module.launchCustomAgentInNewTab
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createTab.mockReturnValue({ id: 'tab-1' })
    mocks.getAgentLaunchPlatformForRepo.mockReturnValue('linux')
    mocks.nodePlatformFromProjectRuntime.mockReturnValue(undefined)
    mocks.getExecutionHostIdForWorktree.mockReturnValue('local')
    mocks.getRuntimeEnvironmentIdForWorktree.mockReturnValue(null)
    mocks.launchAgentInNewTab.mockReturnValue({
      surface: { kind: 'local-terminal', tabId: 'agent-tab-1' },
      startupPlan: {},
      pasteDraftAfterLaunch: false
    })
    mocks.resolveAgentLaunchExecutionContext.mockReturnValue({
      worktreeSshConnectionId: null,
      resolvedLaunchPlatform: 'linux',
      isRemote: false,
      queuedShell: undefined
    })
    store.settings.terminalWindowsShell = 'powershell.exe'
    store.sshConnectionStates.clear()
    store.sshStateByEnvironment.clear()
    store.folderWorkspaces = []
  })

  it('launches a Codex variant through the agent pipeline with exact profile argv', () => {
    expect(launchCustomAgentInNewTab({ profileId: 'codex-luna', worktreeId: 'wt-1' })).toEqual({
      tabId: 'agent-tab-1'
    })

    expect(mocks.launchAgentInNewTab).toHaveBeenCalledWith({
      requestId: expect.any(String),
      agent: 'codex',
      worktreeId: 'wt-1',
      agentArgs: "'--model' 'luna'",
      quickCommandLabel: 'Codex Luna',
      requestedSurface: 'terminal',
      launchPlatform: 'linux'
    })
    expect(mocks.createTab).not.toHaveBeenCalled()
  })

  it('keeps the group the user launched from', () => {
    launchCustomAgentInNewTab({ profileId: 'codex-luna', worktreeId: 'wt-1', groupId: 'group-2' })

    expect(mocks.launchAgentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'group-2', agent: 'codex' })
    )
  })

  it('reports nothing to focus when the agent launch published the tab on a host', () => {
    mocks.launchAgentInNewTab.mockReturnValue({
      surface: { kind: 'host-published' },
      startupPlan: {},
      pasteDraftAfterLaunch: false
    })

    expect(launchCustomAgentInNewTab({ profileId: 'codex-luna', worktreeId: 'wt-1' })).toBeNull()
  })

  it('launches a generic profile as a plain terminal without built-in identity', () => {
    expect(launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'wt-1' })).toEqual({
      tabId: 'tab-1'
    })
    expect(mocks.createTab).toHaveBeenCalledWith('wt-1', undefined, undefined, {
      quickCommandLabel: 'Dhimanex',
      viewMode: 'terminal'
    })
    expect(mocks.queueTabStartupCommand).toHaveBeenCalledWith('tab-1', {
      command: "'dhimanex' '--fast'"
    })
    expect(mocks.launchAgentInNewTab).not.toHaveBeenCalled()
  })

  it('binds the agent whose program the executable now names, not the stale one', () => {
    launchCustomAgentInNewTab({ profileId: 'repointed', worktreeId: 'wt-1' })

    expect(mocks.launchAgentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({ agent: 'claude', agentArgs: '' })
    )
  })

  it('queues the one-shot argv environment for native Windows', () => {
    mocks.getAgentLaunchPlatformForRepo.mockReturnValue('win32')
    store.settings.terminalWindowsShell = 'cmd.exe'
    launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'wt-1' })

    expect(mocks.queueTabStartupCommand).toHaveBeenCalledWith('tab-1', {
      command: expect.stringMatching(/^powershell\.exe .* & set "/),
      env: { ORCA_CUSTOM_AGENT_WINDOWS_RUNNER_V1: expect.any(String) }
    })
  })

  it('uses the known platform for Linux SSH and folder workspaces', () => {
    mocks.getExecutionHostIdForWorktree.mockReturnValue('ssh:folder-host')
    store.sshConnectionStates.set('folder-host', {
      targetId: 'folder-host',
      remotePlatform: 'linux'
    })
    launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'folder:docs' })

    expect(mocks.queueTabStartupCommand).toHaveBeenCalledWith('tab-1', {
      command: "'dhimanex' '--fast'"
    })
  })

  it('uses POSIX argv for a local WSL folder workspace', () => {
    store.folderWorkspaces = [
      {
        id: 'wsl-folder',
        folderPath: '\\\\wsl.localhost\\Ubuntu\\home\\dhiman\\project'
      }
    ]
    launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'folder:wsl-folder' })

    expect(mocks.queueTabStartupCommand).toHaveBeenCalledWith('tab-1', {
      command: "'dhimanex' '--fast'"
    })
  })

  it('fails closed on paired hosts and Windows SSH for a plain program', () => {
    mocks.getExecutionHostIdForWorktree.mockReturnValue('runtime:server')
    expect(launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'wt-1' })).toBeNull()

    mocks.getExecutionHostIdForWorktree.mockReturnValue('ssh:windows-host')
    store.sshConnectionStates.set('windows-host', {
      targetId: 'windows-host',
      remotePlatform: 'win32'
    })
    expect(launchCustomAgentInNewTab({ profileId: 'dhimanex', worktreeId: 'wt-1' })).toBeNull()
    expect(mocks.createTab).not.toHaveBeenCalled()
  })

  it('fails closed when the selected profile was removed', () => {
    expect(
      launchCustomAgentInNewTab({ profileId: 'removed-profile', worktreeId: 'wt-1' })
    ).toBeNull()
    expect(mocks.createTab).not.toHaveBeenCalled()
    expect(mocks.launchAgentInNewTab).not.toHaveBeenCalled()
  })

  it('does not launch a disabled profile', () => {
    expect(launchCustomAgentInNewTab({ profileId: 'disabled', worktreeId: 'wt-1' })).toBeNull()
    expect(mocks.createTab).not.toHaveBeenCalled()
    expect(mocks.launchAgentInNewTab).not.toHaveBeenCalled()
  })
})
