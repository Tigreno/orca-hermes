// Panel ↔ worker contract for the Bugsink plugin.

export type BugsinkProject = {
  id: number
  name: string
  slug: string
  digested_event_count?: number
  stored_event_count?: number
}

export type BugsinkIssue = {
  id: string
  friendly_id?: string
  project: number
  calculated_type?: string
  calculated_value?: string
  transaction?: string
  is_resolved?: boolean
  is_resolved_by_next_release?: boolean
  is_muted?: boolean
  last_seen?: string
  first_seen?: string
  digested_event_count?: number
  stored_event_count?: number
  digest_order?: number
}

declare module 'orca' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- declaration merging needs an interface
  interface PluginRequests {
    'bugsink.projects': { input: Record<string, never>; output: { projects: BugsinkProject[] } }
    'bugsink.issues': { input: { projectId: number }; output: { issues: BugsinkIssue[] } }
    'bugsink.issue': { input: { issueId: string }; output: { issue: BugsinkIssue } }
    'bugsink.issue.latestMessage': {
      input: { issueId: string }
      output: { message: string | null }
    }
    'bugsink.issue.sendToTerminal': { input: { text: string }; output: { ok: true } }
    'bugsink.issue.delete': { input: { issueId: string }; output: { ok: true } }
  }
}
