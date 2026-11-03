import type { GlobalSettings } from './global-settings-types'
import {
  nativeChatPreferenceFor,
  type NativeChatDefaultSettings
} from './structured-native-chat-launch-route'
import type { ExecutionHostId } from './execution-host'
import type { TuiAgent } from './tui-agent'
import { filterEnabledTuiAgents, TUI_AGENT_AUTO_PICK_ORDER } from './tui-agent-selection'
import type { AgentSessionChatProgram } from './agent-session/agent-session-agent-availability'
import {
  getDefaultCustomAgentProfile,
  isCustomAgentProfileEnabled,
  normalizeCustomAgentProfiles,
  type CustomAgentProfile
} from './custom-agent-profile'

export type HostChatAnswer =
  | 'yes'
  | 'not-yet-known'
  | 'ssh'
  | 'wsl'
  | 'subfolder'
  | 'not-on-host'
  | 'no-chats'
export type ChatProgramObservation = AgentSessionChatProgram | 'unlearned'
const chatProgramOffered = (program: ChatProgramObservation) =>
  program === 'available' || program === 'installable'

export function orderAgentLaunchPickerAgents(
  defaultAgent: TuiAgent | 'blank' | null | undefined,
  detected: readonly TuiAgent[],
  disabled?: Iterable<unknown> | null
): TuiAgent[] {
  const enabled = filterEnabledTuiAgents(detected, disabled)
  const ordered = TUI_AGENT_AUTO_PICK_ORDER.filter((agent) => enabled.includes(agent))
  return defaultAgent && defaultAgent !== 'blank' && ordered.includes(defaultAgent)
    ? [defaultAgent, ...ordered.filter((agent) => agent !== defaultAgent)]
    : ordered
}

export type ChatUnavailableReason =
  | 'check-failed'
  | 'not-installed'
  | 'ssh'
  | 'wsl'
  | 'subfolder'
  | 'not-on-host'

export type NewTabAgentMenuRow = (
  | { kind: 'chat'; agent: TuiAgent }
  | { kind: 'chat-unavailable'; agent: TuiAgent; reason: ChatUnavailableReason }
  | { kind: 'cli'; agent: TuiAgent; chat?: true }
  | { kind: 'terminal'; agent: TuiAgent }
  | { kind: 'custom'; profile: CustomAgentProfile; isDefault: boolean }
) & { executionHostId?: ExecutionHostId }

/** A row backed by a built-in agent; custom-profile rows carry a profile instead. */
export type InstalledAgentMenuRow = Exclude<NewTabAgentMenuRow, { kind: 'custom' }>

export const isInstalledAgentMenuRow = (row: NewTabAgentMenuRow): row is InstalledAgentMenuRow =>
  row.kind !== 'custom'

export type NewTabAgentMenuSettings = NativeChatDefaultSettings &
  Partial<Pick<GlobalSettings, 'defaultTuiAgent' | 'disabledTuiAgents' | 'customAgentProfiles'>>

/** Enabled custom profiles, default first: they lead the menu and carry the new-agent shortcut. */
function buildCustomAgentRows(
  profiles: GlobalSettings['customAgentProfiles']
): NewTabAgentMenuRow[] {
  const normalized = normalizeCustomAgentProfiles(profiles)
  const defaultProfile = getDefaultCustomAgentProfile(normalized)
  return normalized
    .filter(isCustomAgentProfileEnabled)
    .map((profile) => ({
      kind: 'custom' as const,
      profile,
      isDefault: defaultProfile?.id === profile.id
    }))
    .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
}

export function buildNewTabAgentMenuRows(args: {
  settings: NewTabAgentMenuSettings | null | undefined
  detectedOnHost: readonly TuiAgent[] | null
  chatAgents: readonly TuiAgent[]
  hostChatAnswer: (agent: TuiAgent) => HostChatAnswer
  /** Whether the chat's own program runs there, which for some agents is not their CLI. */
  chatProgram: (agent: TuiAgent) => ChatProgramObservation
}): NewTabAgentMenuRow[] {
  const { settings } = args
  const defaultAgent = settings?.defaultTuiAgent
  const customRows = buildCustomAgentRows(settings?.customAgentProfiles)
  const installed = filterEnabledTuiAgents(args.detectedOnHost ?? [], settings?.disabledTuiAgents)
  if (args.hostChatAnswer('claude') === 'no-chats') {
    return [
      ...customRows,
      ...orderAgentLaunchPickerAgents(defaultAgent, installed).map((agent) => ({
        kind: 'terminal' as const,
        agent
      }))
    ]
  }
  const runnable: TuiAgent[] = []
  const unavailable = new Map<TuiAgent, ChatUnavailableReason>()
  const chatAgents = filterEnabledTuiAgents(args.chatAgents, settings?.disabledTuiAgents)
  const canOpen = (agent: TuiAgent): boolean =>
    chatProgramOffered(args.chatProgram(agent)) ||
    (args.chatProgram(agent) === 'unknown' && installed.includes(agent))
  const chatToo = new Set<TuiAgent>()
  for (const agent of chatAgents) {
    const displayed = nativeChatPreferenceFor(settings, agent)
    if (!displayed && (!installed.includes(agent) || !canOpen(agent))) {
      continue
    }
    const answer = args.hostChatAnswer(agent)
    if (!displayed) {
      if (answer === 'yes') {
        chatToo.add(agent)
      }
      continue
    }
    const program = args.chatProgram(agent)
    if (answer === 'yes' && canOpen(agent)) {
      runnable.push(agent)
    } else {
      unavailable.set(
        agent,
        answer === 'yes'
          ? program === 'missing'
            ? 'not-installed'
            : 'check-failed'
          : args.detectedOnHost === null
            ? 'check-failed'
            : answer === 'not-yet-known'
              ? 'check-failed'
              : answer === 'no-chats'
                ? 'not-on-host'
                : answer
      )
    }
  }
  return [
    ...customRows,
    ...orderAgentLaunchPickerAgents(defaultAgent, runnable).map((agent) => ({
      kind: 'chat' as const,
      agent
    })),
    ...orderAgentLaunchPickerAgents(defaultAgent, [...unavailable.keys()]).map((agent) => ({
      kind: 'chat-unavailable' as const,
      agent,
      reason: unavailable.get(agent) ?? 'not-on-host'
    })),
    ...orderAgentLaunchPickerAgents(
      defaultAgent,
      installed.filter((agent) => !runnable.includes(agent))
    ).map((agent) => ({
      kind: 'cli' as const,
      agent,
      ...(chatToo.has(agent) ? { chat: true as const } : {})
    }))
  ]
}
