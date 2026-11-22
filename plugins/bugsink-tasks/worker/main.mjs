const API_PREFIX = '/api/canonical/0'

/** @param {import('orca/worker').OrcaWorkerApi} orca */
async function config(orca) {
  const base = String((await orca.settings.get('baseUrl')) ?? '')
    .trim()
    .replace(/\/+$/, '')
  const token = String((await orca.settings.get('apiToken')) ?? '').trim()
  if (!base) {
    throw new Error('Bugsink URL is not set. Open Settings → Plugins → Bugsink.')
  }
  if (!token) {
    throw new Error('Bugsink API token is not set. Open Settings → Plugins → Bugsink.')
  }
  return { base, token }
}

/** @param {import('orca/worker').OrcaWorkerApi} orca */
async function request(orca, path, query, options = {}) {
  const { base, token } = await config(orca)
  const url = new URL(base + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  let response
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...options.headers
      },
      body: options.body
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not reach Bugsink at ${base}: ${message}`)
  }
  if (!response.ok) {
    let detail = ''
    try {
      detail = await response.text()
    } catch {
      detail = ''
    }
    detail = detail.trim()
    if (detail.length > 300) {
      detail = `${detail.slice(0, 300)}…`
    }
    throw new Error(`Bugsink API ${response.status}${detail ? `: ${detail}` : ''}`)
  }
  if (response.status === 204) {
    return null
  }
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** @param {unknown} event */
function eventMessage(event) {
  const data = event && typeof event === 'object' ? event.data : null
  if (data && typeof data === 'object') {
    const log = data.logentry
    if (log && typeof log === 'object') {
      if (typeof log.formatted === 'string' && log.formatted.trim()) {
        return log.formatted.trim()
      }
      if (typeof log.message === 'string' && log.message.trim()) {
        return log.message.trim()
      }
    }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim()
    }
    const values =
      data.exception && Array.isArray(data.exception.values) ? data.exception.values : []
    if (values.length > 0) {
      const last = values.at(-1)
      if (last && typeof last === 'object') {
        const type = typeof last.type === 'string' ? last.type : ''
        const value = typeof last.value === 'string' ? last.value : ''
        const joined = [type, value].filter(Boolean).join(': ').trim()
        if (joined) {
          return joined
        }
      }
    }
  }
  if (typeof event?.stacktrace_md === 'string' && event.stacktrace_md.trim()) {
    const line = event.stacktrace_md.split('\n').find((entry) => entry.trim())
    if (line) {
      return line.trim()
    }
  }
  return null
}

/** @type {import('orca/worker').Activate} */
export default function activate(orca) {
  orca.panels.handle('bugsink.projects', async () => {
    const data = await request(orca, `${API_PREFIX}/projects/`)
    return { projects: Array.isArray(data?.results) ? data.results : [] }
  })

  orca.panels.handle('bugsink.issues', async ({ projectId }) => {
    const id = Number(projectId)
    if (!Number.isFinite(id)) {
      throw new Error('A Bugsink project must be selected.')
    }
    const data = await request(orca, `${API_PREFIX}/issues/`, { project: id })
    return { issues: Array.isArray(data?.results) ? data.results : [] }
  })

  orca.panels.handle('bugsink.issue', async ({ issueId }) => {
    const id = String(issueId || '').trim()
    if (!id) {
      throw new Error('A Bugsink issue must be selected.')
    }
    const issue = await request(orca, `${API_PREFIX}/issues/${encodeURIComponent(id)}/`)
    return { issue }
  })

  orca.panels.handle('bugsink.issue.latestMessage', async ({ issueId }) => {
    const id = String(issueId || '').trim()
    if (!id) {
      throw new Error('A Bugsink issue must be selected.')
    }
    const list = await request(orca, `${API_PREFIX}/events/`, { issue: id, order: 'desc' })
    const latest = Array.isArray(list?.results) ? list.results[0] : null
    if (!latest?.id) {
      return { message: null }
    }
    const event = await request(
      orca,
      `${API_PREFIX}/events/${encodeURIComponent(String(latest.id))}/`
    )
    return { message: eventMessage(event) }
  })

  orca.panels.handle('bugsink.issue.sendToTerminal', async ({ text }) => {
    const value = String(text || '').trim()
    if (!value) {
      throw new Error('Nothing to send.')
    }

    try {
      await orca.host.call('agent.insertDraft', { text: value })
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const unavailable =
        message.includes('not_permitted') ||
        message.includes('unknown_method') ||
        message.includes('invalid_request') ||
        message.includes('only the Orca desktop app')

      if (!unavailable) {
        throw error
      }
    }

    let terminalId = null
    try {
      const { agents } = await orca.host.call('agents.list')
      const candidates = Array.isArray(agents)
        ? agents.filter(
            (agent) => agent && typeof agent.terminalId === 'string' && agent.terminalId
          )
        : []
      const rank = { waiting: 0, blocked: 1, done: 2, working: 3 }
      candidates.sort((a, b) => {
        const ra = Object.hasOwn(rank, a.state) ? rank[a.state] : 9
        const rb = Object.hasOwn(rank, b.state) ? rank[b.state] : 9
        if (ra !== rb) {
          return ra - rb
        }
        return Number(b.stateStartedAt || 0) - Number(a.stateStartedAt || 0)
      })
      terminalId = candidates.at(0)?.terminalId || null
    } catch {
      terminalId = null
    }

    if (!terminalId) {
      const context = await orca.host.call('workspace.readContext')
      if (!context) {
        throw new Error('No active workspace.')
      }
      const terminals = Array.isArray(context.terminals) ? context.terminals : []
      terminalId = terminals.at(-1)?.id || null
    }

    if (!terminalId) {
      throw new Error(
        'No active agent input is available. Open an agent terminal in the active workspace, or focus a terminal-backed agent.'
      )
    }

    await orca.host.call('terminal.sendText', { terminalId, text: value })
    return { ok: true }
  })

  orca.panels.handle('bugsink.issue.delete', async ({ issueId }) => {
    const id = String(issueId || '').trim()
    if (!id) {
      throw new Error('A Bugsink issue must be selected.')
    }
    await request(orca, `${API_PREFIX}/issues/${encodeURIComponent(id)}/`, undefined, {
      method: 'DELETE'
    })
    return { ok: true }
  })
}
