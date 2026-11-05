import {
  API_RESPONSE_MAX_BYTES,
  readFetchResponseJsonWithinLimit
} from '../../shared/fetch-response-body'
import { taskProviderFailure } from '../../shared/task-provider-failure'
import {
  buildBitrix24WebhookUrl,
  parseBitrix24WebhookUrl,
  type Bitrix24WebhookCredential
} from '../../shared/bitrix24/webhook-url'
import type {
  Bitrix24ConnectArgs,
  Bitrix24ConnectionStatus
} from '../../shared/bitrix24/connection-types'
import {
  Bitrix24ApiError,
  Bitrix24NotConnectedError,
  Bitrix24RateLimitError,
  bitrix24ErrorMessage
} from './errors'
import {
  clearWebhookCredential,
  hasStoredWebhook,
  readWebhookCredential,
  saveWebhookCredential
} from './webhook-credential-store'

const MIN_REQUEST_INTERVAL_MS = 500
const MAX_ATTEMPTS = 4
const MAX_RETRY_DELAY_MS = 30_000
export const BITRIX24_REQUIRED_SCOPES = ['task', 'tasks', 'user_basic', 'sonet_group'] as const

type Bitrix24Envelope<T> = {
  result?: T
  total?: number
  next?: number
  time?: unknown
  error?: string
  error_description?: string
  operating_reset_at?: number
}

let queueTail: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0
let cachedScopes: { portalHost: string; scopes: string[] } | null = null

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTurn(): Promise<void> {
  const wait = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now())
  if (wait > 0) {
    await delay(wait)
  }
  lastRequestAt = Date.now()
}

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(
    async () => {
      await waitForTurn()
      return task()
    },
    async () => {
      await waitForTurn()
      return task()
    }
  )
  queueTail = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export function getStoredCredential(): Bitrix24WebhookCredential {
  const credential = readWebhookCredential()
  if (!credential) {
    throw new Bitrix24NotConnectedError()
  }
  return credential
}

function parseResetAt(payload: Bitrix24Envelope<unknown>, headers: Headers): number | null {
  const resetAt = payload.operating_reset_at
  if (typeof resetAt === 'number' && Number.isFinite(resetAt)) {
    return resetAt < 10_000_000_000 ? resetAt * 1000 : resetAt
  }
  const retryAfter = headers.get('retry-after')
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Date.now() + Number(retryAfter) * 1000
  }
  return null
}

async function requestOnce<T>(
  credential: Bitrix24WebhookCredential,
  method: string,
  params: unknown
): Promise<Bitrix24Envelope<T>> {
  const url = `${buildBitrix24WebhookUrl(credential)}${method}.json`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params ?? {})
  })
  const payload = await readFetchResponseJsonWithinLimit<Bitrix24Envelope<T>>(
    response,
    API_RESPONSE_MAX_BYTES
  )
  if (!payload || typeof payload !== 'object') {
    throw new Bitrix24ApiError(
      method,
      'invalid_response',
      'Invalid Bitrix24 response.',
      response.status
    )
  }
  const envelope = payload
  if (envelope.error || !response.ok) {
    throw new Bitrix24ApiError(
      method,
      envelope.error ?? `http_${response.status}`,
      envelope.error_description ?? `Bitrix24 request failed with HTTP ${response.status}.`,
      response.status,
      parseResetAt(payload, response.headers)
    )
  }
  return envelope
}

function retryDelay(attempt: number, resetAt: number | null): number {
  if (resetAt !== null) {
    const untilReset = resetAt - Date.now()
    if (untilReset > 0) {
      return Math.min(untilReset, MAX_RETRY_DELAY_MS)
    }
  }
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

export async function bitrix24Request<T>(
  method: string,
  params?: unknown,
  options: {
    credential?: Bitrix24WebhookCredential
    signal?: AbortSignal
  } = {}
): Promise<Bitrix24Envelope<T>> {
  const credential = options.credential ?? getStoredCredential()
  return serialize(async () => {
    let lastError: unknown
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (options.signal?.aborted) {
        throw new DOMException('Bitrix24 request aborted', 'AbortError')
      }
      try {
        return await requestOnce<T>(credential, method, params)
      } catch (error) {
        lastError = error
        if (!(error instanceof Bitrix24ApiError) || !error.isRateLimit) {
          throw error
        }
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new Bitrix24RateLimitError(error.resetAt)
        }
        await delay(retryDelay(attempt, error.resetAt))
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Bitrix24 request failed.')
  })
}

async function fetchScopes(credential: Bitrix24WebhookCredential): Promise<string[]> {
  const url = `${buildBitrix24WebhookUrl(credential)}scope.json`
  const response = await fetch(url, { method: 'GET' })
  const payload = await readFetchResponseJsonWithinLimit<Bitrix24Envelope<unknown>>(
    response,
    API_RESPONSE_MAX_BYTES
  )
  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Bitrix24ApiError(
      'scope',
      `http_${response.status}`,
      'Could not read Bitrix24 scopes.',
      response.status
    )
  }
  const record = payload
  if (record.error) {
    throw new Bitrix24ApiError(
      'scope',
      record.error,
      record.error_description ?? 'Could not read Bitrix24 scopes.',
      response.status
    )
  }
  const scopes = Array.isArray(record.result)
    ? record.result.filter((scope): scope is string => typeof scope === 'string')
    : []
  cachedScopes = { portalHost: credential.portalHost, scopes }
  return scopes
}

export function getCachedScopes(portalHost: string): string[] {
  return cachedScopes?.portalHost === portalHost ? cachedScopes.scopes : []
}

function missingScopes(scopes: readonly string[]): string[] {
  return BITRIX24_REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope))
}

export function getStatus(): Bitrix24ConnectionStatus {
  let connected = false
  let portalHost: string | null = null
  let userId: string | null = null
  let error: string | null = null
  try {
    connected = hasStoredWebhook()
    const credential = readWebhookCredential()
    portalHost = credential?.portalHost ?? null
    userId = credential?.userId ?? null
  } catch (caught) {
    error = bitrix24ErrorMessage(caught)
  }
  return {
    connected: connected && error === null,
    portalHost,
    userId,
    scopes: portalHost ? getCachedScopes(portalHost) : [],
    error
  }
}

export async function connect(
  args: Bitrix24ConnectArgs
): Promise<{ ok: true; status: Bitrix24ConnectionStatus } | { ok: false; error: string }> {
  const credential = parseBitrix24WebhookUrl(args.webhookUrl)
  if (!credential) {
    return taskProviderFailure(
      'bitrix24.invalidWebhook',
      'Enter a Bitrix24 incoming webhook URL like https://portal/rest/user/token/'
    )
  }
  try {
    const scopes = await fetchScopes(credential)
    const missing = missingScopes(scopes)
    if (missing.length > 0) {
      return taskProviderFailure(
        'bitrix24.missingScope',
        `Bitrix24 webhook is missing required scopes: ${missing.join(', ')}.`
      )
    }
    saveWebhookCredential(credential)
    return { ok: true, status: getStatus() }
  } catch (caught) {
    return { ok: false, error: bitrix24ErrorMessage(caught) }
  }
}

export function disconnect(): void {
  clearWebhookCredential()
  cachedScopes = null
}

export async function testConnection(): Promise<
  { ok: true; status: Bitrix24ConnectionStatus } | { ok: false; error: string }
> {
  try {
    const credential = getStoredCredential()
    const scopes = await fetchScopes(credential)
    const missing = missingScopes(scopes)
    if (missing.length > 0) {
      return taskProviderFailure(
        'bitrix24.missingScope',
        `Bitrix24 webhook is missing required scopes: ${missing.join(', ')}.`
      )
    }
    return { ok: true, status: getStatus() }
  } catch (caught) {
    return { ok: false, error: bitrix24ErrorMessage(caught) }
  }
}
