export class Bitrix24ApiError extends Error {
  constructor(
    readonly method: string,
    readonly code: string,
    description: string,
    readonly status: number,
    readonly resetAt: number | null = null
  ) {
    super(description || code)
    this.name = 'Bitrix24ApiError'
  }

  get isRateLimit(): boolean {
    return (
      this.status === 429 ||
      this.status === 503 ||
      this.code === 'QUERY_LIMIT_EXCEEDED' ||
      this.code === 'OPERATION_TIME_LIMIT'
    )
  }

  get isScopeError(): boolean {
    return this.code === 'insufficient_scope' || this.code === 'insufficient_scope_token'
  }

  get isAuthError(): boolean {
    return (
      this.status === 401 ||
      this.code === 'invalid_credentials' ||
      this.code === 'expired_token' ||
      this.code === 'invalid_grant'
    )
  }
}

export class Bitrix24NotConnectedError extends Error {
  constructor() {
    super('Not connected to Bitrix24.')
    this.name = 'Bitrix24NotConnectedError'
  }
}

export class Bitrix24RateLimitError extends Error {
  constructor(readonly resetAt: number | null) {
    super('Bitrix24 rate limit reached. Try again shortly.')
    this.name = 'Bitrix24RateLimitError'
  }
}

export function isBitrix24RateLimit(error: unknown): boolean {
  return (
    error instanceof Bitrix24RateLimitError ||
    (error instanceof Bitrix24ApiError && error.isRateLimit)
  )
}

export function bitrix24ErrorMessage(error: unknown): string {
  if (error instanceof Bitrix24ApiError) {
    if (error.isScopeError) {
      return `Bitrix24 webhook is missing a required scope: ${error.message}`
    }
    if (error.isAuthError) {
      return 'Bitrix24 webhook was rejected. Reconnect Bitrix24.'
    }
    return error.message || 'Bitrix24 request failed.'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Bitrix24 request failed.'
}
