import { describe, expect, it } from 'vitest'
import type { AgentCatalogEntry } from '@/lib/agent-catalog'
import { resolveCustomAgentProfileBaseAgent } from './custom-agent-profile-base-agent'

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the resolver reads only `id` and `cmd`.
const catalog = [
  { id: 'codex', cmd: 'codex' },
  { id: 'hermes', cmd: 'hermes' },
  { id: 'claude-agent-teams', cmd: 'claude --teammate-mode in-process' }
] as AgentCatalogEntry[]

describe('resolveCustomAgentProfileBaseAgent', () => {
  it('binds a typed executable that names a known agent', () => {
    expect(resolveCustomAgentProfileBaseAgent({ executable: 'hermes' }, catalog)).toBe('hermes')
  })

  it('matches a full path and a Windows launcher suffix', () => {
    expect(
      resolveCustomAgentProfileBaseAgent({ executable: 'C:\\tools\\Codex.exe' }, catalog)
    ).toBe('codex')
    expect(
      resolveCustomAgentProfileBaseAgent({ executable: '/usr/local/bin/hermes' }, catalog)
    ).toBe('hermes')
  })

  it('matches a catalog command that carries its own flags', () => {
    expect(resolveCustomAgentProfileBaseAgent({ executable: 'claude' }, catalog)).toBe(
      'claude-agent-teams'
    )
  })

  it('leaves an unknown program as a plain terminal', () => {
    expect(resolveCustomAgentProfileBaseAgent({ executable: 'my-agent.sh' }, catalog)).toBeNull()
  })

  it('keeps a binding the profile already declares', () => {
    expect(
      resolveCustomAgentProfileBaseAgent({ baseAgent: 'codex', executable: 'hermes' }, catalog)
    ).toBe('codex')
  })
})
