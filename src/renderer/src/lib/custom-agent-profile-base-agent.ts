import type { AgentCatalogEntry } from '@/lib/agent-catalog'
import type { CustomAgentProfile } from '../../../shared/custom-agent-profile'
import type { TuiAgent } from '../../../shared/tui-agent'

/** The program a command line names, so `C:\bin\codex.exe` and `codex` compare equal. */
function programName(value: string): string {
  const first = value.trim().split(/\s+/)[0] ?? ''
  const base = first.split(/[\\/]/).pop() ?? first
  return base.replace(/\.(exe|cmd|bat)$/i, '').toLowerCase()
}

/**
 * The built-in agent a profile is a variant of.
 *
 * Why it matters: a variant profile must launch through Orca's agent pipeline, otherwise its pane
 * gets no terminal handle and the agent's status never attaches — the tab reads as a plain terminal
 * and the workspace tree never shows the agent. Only an exact program match counts, so a wrapper
 * script or another binary keeps the plain-terminal path.
 */
export function resolveCustomAgentProfileBaseAgent(
  profile: Pick<CustomAgentProfile, 'baseAgent' | 'executable'>,
  catalog: readonly AgentCatalogEntry[]
): TuiAgent | null {
  if (profile.baseAgent) {
    return profile.baseAgent
  }
  const executable = programName(profile.executable)
  if (!executable) {
    return null
  }
  return catalog.find((entry) => programName(entry.cmd) === executable)?.id ?? null
}
