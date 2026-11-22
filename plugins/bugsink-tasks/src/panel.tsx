import {
  atom,
  Badge,
  Button,
  Code,
  EmptyState,
  Heading,
  List,
  ListItem,
  Row,
  Stack,
  Text,
  plugin,
  read,
  set,
  type PanelContext
} from 'orca'
import type { BugsinkIssue, BugsinkProject } from './protocol'

const projects = atom<BugsinkProject[]>('bugsink:projects', [], { persist: 'storage' })
const issues = atom<BugsinkIssue[]>('bugsink:issues', [], { persist: 'storage' })
const selectedProjectId = atom<number | null>('bugsink:selectedProject', null, {
  persist: 'storage'
})
const selectedIssueId = atom<string | null>('bugsink:selectedIssue', null, { persist: 'storage' })
const selectedIssue = atom<BugsinkIssue | null>(null)
const selectedIssueMessage = atom<string | null>(null)
const loading = atom(false)
const error = atom<string | null>(null)
const deleting = atom(false)
const confirmDeleteId = atom<string | null>(null)
const sendingToTerminal = atom(false)

function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught)
}

function issueTitle(issue: BugsinkIssue): string {
  return issue.calculated_type || issue.friendly_id || issue.id
}

function issueDescription(issue: BugsinkIssue): string {
  const value = (issue.calculated_value || '').replace(/\s+/g, ' ').trim()
  return value.length > 140 ? `${value.slice(0, 140)}…` : value
}

function formatTime(value?: string): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

async function loadProjects(): Promise<void> {
  set(loading, true)
  set(error, null)
  try {
    const { projects: list } = await plugin.request('bugsink.projects', {})
    set(projects, Array.isArray(list) ? list : [])
  } catch (caught) {
    set(error, messageOf(caught))
  } finally {
    set(loading, false)
  }
}

async function loadIssues(projectId: number): Promise<void> {
  set(loading, true)
  set(error, null)
  set(selectedProjectId, projectId)
  set(selectedIssueId, null)
  set(selectedIssue, null)
  set(selectedIssueMessage, null)
  set(confirmDeleteId, null)
  try {
    const { issues: list } = await plugin.request('bugsink.issues', { projectId })
    set(issues, Array.isArray(list) ? list : [])
  } catch (caught) {
    set(issues, [])
    set(error, messageOf(caught))
  } finally {
    set(loading, false)
  }
}

async function loadIssue(issueId: string): Promise<void> {
  set(loading, true)
  set(error, null)
  set(selectedIssueId, issueId)
  set(confirmDeleteId, null)
  set(selectedIssueMessage, null)
  try {
    const [issueResult, messageResult] = await Promise.all([
      plugin.request('bugsink.issue', { issueId }),
      plugin.request('bugsink.issue.latestMessage', { issueId }).catch(() => ({ message: null }))
    ])
    set(selectedIssue, issueResult.issue ?? null)
    set(selectedIssueMessage, messageResult.message ?? null)
  } catch (caught) {
    set(selectedIssue, null)
    set(selectedIssueMessage, null)
    set(error, messageOf(caught))
  } finally {
    set(loading, false)
  }
}

function issueTerminalText(issue: BugsinkIssue, lastMessage: string | null): string {
  const message = (lastMessage ?? issue.calculated_value ?? '').replace(/\s+/g, ' ').trim() || '—'
  return `Bugsink ${issue.id} . ${message}.`
}

function refresh(): void {
  const issueId = read(selectedIssueId)
  if (issueId) {
    void loadIssue(issueId)
    return
  }
  const projectId = read(selectedProjectId)
  if (projectId != null) {
    void loadIssues(projectId)
    return
  }
  void loadProjects()
}

async function sendIssueToTerminal(issue: BugsinkIssue): Promise<void> {
  set(sendingToTerminal, true)
  set(error, null)
  try {
    const text = issueTerminalText(issue, read(selectedIssueMessage))
    await plugin.request('bugsink.issue.sendToTerminal', { text })
  } catch (caught) {
    set(error, messageOf(caught))
  } finally {
    set(sendingToTerminal, false)
  }
}

async function deleteIssue(issueId: string): Promise<void> {
  set(deleting, true)
  set(error, null)
  try {
    await plugin.request('bugsink.issue.delete', { issueId })
    set(
      issues,
      read(issues).filter((issue) => issue.id !== issueId)
    )
    set(confirmDeleteId, null)
    set(selectedIssueId, null)
    set(selectedIssue, null)
  } catch (caught) {
    set(error, messageOf(caught))
  } finally {
    set(deleting, false)
  }
}

export function setup(_ctx: PanelContext): void {
  void loadProjects().then(async () => {
    const projectId = read(selectedProjectId)
    if (projectId != null) {
      await loadIssues(projectId)
      const issueId = read(selectedIssueId)
      if (issueId) {
        await loadIssue(issueId)
      }
    }
  })
}

function ProjectsView() {
  const list = read(projects)
  if (list.length === 0) {
    return (
      <EmptyState
        icon="bug"
        title="No projects"
        description="No Bugsink projects were returned. Check the server URL and token in Settings."
      />
    )
  }
  return (
    <List label="Projects">
      {list.map((project) => (
        <ListItem
          key={String(project.id)}
          icon="folder"
          title={project.name || project.slug || `Project ${project.id}`}
          description={`${project.stored_event_count ?? 0} stored events`}
          onPress={() => void loadIssues(project.id)}
        />
      ))}
    </List>
  )
}

function IssuesView() {
  const projectId = read(selectedProjectId)
  const list = read(issues)
  const project = read(projects).find((item) => item.id === projectId)
  return (
    <Stack gap="sm">
      <Row justify="between">
        <Heading size="sm">{project?.name || 'Issues'}</Heading>
        <Button
          variant="ghost"
          onPress={() => {
            set(confirmDeleteId, null)
            set(selectedProjectId, null)
            set(issues, [])
            set(selectedIssueId, null)
            set(selectedIssue, null)
            set(selectedIssueMessage, null)
          }}
        >
          Projects
        </Button>
      </Row>
      {list.length === 0 ? (
        <EmptyState icon="check" title="No issues" description="This project has no issues." />
      ) : (
        <List label="Issues">
          {list.map((issue) => (
            <ListItem
              key={issue.id}
              icon={issue.is_resolved ? 'check' : issue.is_muted ? 'pause' : 'warning'}
              title={`${issue.friendly_id ? `${issue.friendly_id} · ` : ''}${issueTitle(issue)}`}
              description={issueDescription(issue)}
              onPress={() => void loadIssue(issue.id)}
            />
          ))}
        </List>
      )}
    </Stack>
  )
}

function IssueDetailView() {
  const issue = read(selectedIssue)
  if (!issue) {
    return (
      <EmptyState
        icon="search"
        title="Issue not found"
        description="Could not load the selected issue."
      />
    )
  }
  const message = read(selectedIssueMessage)
  const isConfirming = read(confirmDeleteId) === issue.id
  const busyDelete = read(deleting)
  const busySend = read(sendingToTerminal)
  const transferText = issueTerminalText(issue, message)
  return (
    <Stack gap="sm">
      <Row justify="between">
        <Button
          variant="ghost"
          onPress={() => {
            set(confirmDeleteId, null)
            set(selectedIssueId, null)
            set(selectedIssue, null)
            set(selectedIssueMessage, null)
          }}
        >
          Back
        </Button>
        <Row gap="xs">
          {issue.is_resolved ? (
            <Badge tone="success">Resolved</Badge>
          ) : (
            <Badge tone="warning">Open</Badge>
          )}
          {issue.is_muted ? <Badge>Muted</Badge> : null}
        </Row>
      </Row>
      <Heading size="sm">{issue.friendly_id || issue.id}</Heading>
      <Text>{issue.calculated_type || 'Issue'}</Text>
      <Text muted size="sm">
        {issue.calculated_value || 'No message'}
      </Text>
      <Stack gap="xs">
        <Text size="xs" muted>
          Events: {issue.digested_event_count ?? 0} digested / {issue.stored_event_count ?? 0}{' '}
          stored
        </Text>
        <Text size="xs" muted>
          First seen: {formatTime(issue.first_seen)}
        </Text>
        <Text size="xs" muted>
          Last seen: {formatTime(issue.last_seen)}
        </Text>
        {issue.transaction ? (
          <Text size="xs" muted>
            Transaction: {issue.transaction}
          </Text>
        ) : null}
        <Text size="xs" muted>
          Last message: {message ?? issue.calculated_value ?? '—'}
        </Text>
      </Stack>
      <Stack gap="xs">
        <Text size="xs" muted>
          Текст для переноса (можно выделить и скопировать)
        </Text>
        <Code block>{transferText}</Code>
      </Stack>
      <Row justify="end" gap="xs">
        <Button
          variant="ghost"
          onPress={() => void sendIssueToTerminal(issue)}
          disabled={busyDelete || busySend}
        >
          {busySend ? 'Отправка…' : 'перенести в терминал'}
        </Button>
        {isConfirming ? (
          <>
            <Button
              variant="ghost"
              onPress={() => set(confirmDeleteId, null)}
              disabled={busyDelete}
            >
              Cancel
            </Button>
            <Button onPress={() => void deleteIssue(issue.id)} disabled={busyDelete}>
              {busyDelete ? 'Deleting…' : 'Confirm delete'}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            onPress={() => set(confirmDeleteId, issue.id)}
            disabled={busyDelete || busySend}
          >
            Delete issue
          </Button>
        )}
      </Row>
    </Stack>
  )
}

export default function Panel() {
  const err = read(error)
  const busy = read(loading)
  const projectId = read(selectedProjectId)
  const issueId = read(selectedIssueId)

  let content
  if (issueId) {
    content = <IssueDetailView />
  } else if (projectId != null) {
    content = <IssuesView />
  } else {
    content = <ProjectsView />
  }

  return (
    <Stack gap="md">
      <Row justify="between">
        <Heading>Bugsink</Heading>
        <Row gap="xs">
          {busy ? <Badge tone="accent">Loading</Badge> : null}
          <Button variant="ghost" onPress={refresh}>
            Refresh
          </Button>
        </Row>
      </Row>
      {err ? <Text tone="danger">{err}</Text> : null}
      {content}
    </Stack>
  )
}
