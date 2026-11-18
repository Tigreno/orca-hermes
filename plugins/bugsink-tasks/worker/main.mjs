const API_PREFIX = '/api/canonical/0'

/** @param {import('orca/worker').OrcaWorkerApi} orca */
async function config(orca) {
  const base = String((await orca.settings.get('baseUrl')) ?? '').trim().replace(/\/+$/, '')
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
        ...(options.headers || {})
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
      detail = detail.slice(0, 300) + '…'
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
