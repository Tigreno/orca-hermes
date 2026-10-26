import { toast } from 'sonner'
import { getAgentCatalog } from '@/lib/agent-catalog'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import { resolveAgentLaunchExecutionContext } from '@/lib/launch-agent-execution-context'
import { resolveCustomAgentProfileBaseAgent } from '@/lib/custom-agent-profile-base-agent'
import { persistAgentLaunchTabOrder } from '@/lib/launch-agent-tab-order'
import { translate } from '@/i18n/i18n'
import {
  getAgentLaunchPlatformForRepo,
  nodePlatformFromProjectRuntime
} from '@/lib/agent-launch-platform'
import { getLocalProjectExecutionRuntimeContext } from '@/lib/local-preflight-context'
import { CLIENT_PLATFORM } from '@/lib/new-workspace'
import {
  getExecutionHostIdForWorktree,
  getRuntimeEnvironmentIdForWorktree
} from '@/lib/worktree-runtime-owner'
import { useAppStore } from '@/store'
import { worktreeUsesWslPath } from '@/store/terminals/terminal-workspace-routing'
import { repoIsRemote } from '../../../shared/agent-launch-remote'
import {
  buildCustomAgentLaunch,
  isCustomAgentProfileEnabled,
  normalizeCustomAgentProfiles,
  type CustomAgentProfile
} from '../../../shared/custom-agent-profile'
import { parseExecutionHostId } from '../../../shared/execution-host'
import { quoteStartupArg, resolveStartupShell } from '../../../shared/tui-agent-startup-shell'
import { resolveLocalWindowsAgentStartupShell } from '../../../shared/windows-terminal-shell'
import type { TuiAgent } from '../../../shared/tui-agent'

export function launchCustomAgentInNewTab(args: {
  profileId: string
  worktreeId: string
  groupId?: string
}): { tabId: string } | null {
  const store = useAppStore.getState()
  const profile = normalizeCustomAgentProfiles(store.settings?.customAgentProfiles).find(
    (candidate) => candidate.id === args.profileId
  )
  if (!profile) {
    toast.error(
      translate(
        'auto.lib.launchCustomAgentInNewTab.profileRemoved',
        'This custom agent was removed. Choose another agent.'
      )
    )
    return null
  }
  if (!isCustomAgentProfileEnabled(profile)) {
    toast.error(
      translate(
        'auto.lib.launchCustomAgentInNewTab.profileDisabled',
        'This custom agent is disabled. Enable it in Agent settings to launch it.'
      )
    )
    return null
  }

  // Why first: a variant of a built-in agent has to run through the agent pipeline, otherwise its
  // pane gets no agent identity and the workspace tree never shows the agent. Only a plain program
  // name that Orca does not know falls through to the raw-terminal launch below.
  const baseAgent = resolveCustomAgentProfileBaseAgent(profile, getAgentCatalog())
  if (baseAgent) {
    return launchProfileThroughAgentPipeline({
      profile,
      agent: baseAgent,
      worktreeId: args.worktreeId,
      ...(args.groupId ? { groupId: args.groupId } : {})
    })
  }

  const environmentId = getRuntimeEnvironmentIdForWorktree(store, args.worktreeId)
  const executionHost = parseExecutionHostId(getExecutionHostIdForWorktree(store, args.worktreeId))
  if (executionHost?.kind === 'runtime') {
    toast.error(
      translate(
        'auto.lib.launchCustomAgentInNewTab.pairedRuntimeUnsupported',
        'Custom agents are not yet available on paired Orca hosts.'
      )
    )
    return null
  }

  const sshPlatform =
    executionHost?.kind === 'ssh'
      ? environmentId
        ? store.sshStateByEnvironment
            .get(environmentId)
            ?.connectionStates.get(executionHost.targetId)?.remotePlatform
        : store.sshConnectionStates.get(executionHost.targetId)?.remotePlatform
      : null
  if (executionHost?.kind === 'ssh' && !sshPlatform) {
    toast.error(
      translate(
        'auto.lib.launchCustomAgentInNewTab.sshUnavailable',
        'Reconnect the SSH target before launching a custom agent.'
      )
    )
    return null
  }
  if (sshPlatform === 'win32') {
    toast.error(
      translate(
        'auto.lib.launchCustomAgentInNewTab.windowsSshUnsupported',
        'Custom agents are not yet available over Windows SSH.'
      )
    )
    return null
  }

  const worktree = store
    .allWorktrees?.()
    .find((entry: { id: string }) => entry.id === args.worktreeId)
  const repo = worktree ? store.repos?.find((entry) => entry.id === worktree.repoId) : null
  const localProjectRuntime = getLocalProjectExecutionRuntimeContext(store, args.worktreeId)
  const platform =
    sshPlatform ??
    (repo
      ? getAgentLaunchPlatformForRepo(
          repo,
          repo.connectionId ? undefined : nodePlatformFromProjectRuntime(localProjectRuntime)
        )
      : worktreeUsesWslPath(store, args.worktreeId)
        ? 'linux'
        : CLIENT_PLATFORM)
  const isRemote = repo ? repoIsRemote(repo) : false
  const shell = resolveStartupShell(
    platform,
    resolveLocalWindowsAgentStartupShell({
      platform,
      isRemote,
      terminalWindowsShell: store.settings?.terminalWindowsShell
    })
  )
  const launch = buildCustomAgentLaunch(profile, shell)

  const tab = store.createTab(args.worktreeId, args.groupId, undefined, {
    quickCommandLabel: profile.name,
    viewMode: 'terminal'
  })
  store.queueTabStartupCommand(tab.id, {
    command: launch.command,
    ...(launch.env ? { env: launch.env } : {})
  })
  store.setActiveTabType('terminal', args.worktreeId)
  persistAgentLaunchTabOrder(args.worktreeId, tab.id)
  return { tabId: tab.id }
}

/**
 * A profile that names a built-in agent is that agent with extra flags: hand it to the agent
 * launch, which binds the pane's agent identity (terminal handle, launch token, status hooks) and
 * keeps the profile's argv exactly — `agentArgs` replaces the agent's configured defaults.
 */
function launchProfileThroughAgentPipeline(args: {
  profile: CustomAgentProfile
  agent: TuiAgent
  worktreeId: string
  groupId?: string
}): { tabId: string } | null {
  const executionContext = resolveAgentLaunchExecutionContext(useAppStore.getState(), {
    worktreeId: args.worktreeId
  })
  if (!executionContext) {
    return null
  }
  const shell =
    executionContext.queuedShell ?? resolveStartupShell(executionContext.resolvedLaunchPlatform)
  // Why quoted here: the agent launch re-tokenizes this text for the same shell before appending.
  const agentArgs = args.profile.args.map((arg) => quoteStartupArg(arg, shell)).join(' ')
  const launched = launchAgentInNewTab({
    requestId: newAgentLaunchRequestId(),
    agent: args.agent,
    worktreeId: args.worktreeId,
    ...(args.groupId ? { groupId: args.groupId } : {}),
    agentArgs,
    quickCommandLabel: args.profile.name,
    requestedSurface: 'terminal',
    launchPlatform: executionContext.resolvedLaunchPlatform
  })
  if (!launched || launched.surface.kind === 'host-published') {
    return null
  }
  return { tabId: launched.surface.tabId }
}
