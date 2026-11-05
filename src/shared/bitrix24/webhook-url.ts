export type Bitrix24WebhookCredential = {
  portalHost: string
  userId: string
  token: string
}

/** Parses `https://<portal>/rest/<userId>/<token>/` from an incoming webhook URL. */
export function parseBitrix24WebhookUrl(value: unknown): Bitrix24WebhookCredential | null {
  if (typeof value !== 'string') {
    return null
  }
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') {
    return null
  }
  const match = url.pathname.match(/^\/rest\/([^/]+)\/([^/]+)\/?$/)
  if (!match) {
    return null
  }
  const portalHost = url.host.toLowerCase()
  if (!portalHost) {
    return null
  }
  return { portalHost, userId: match[1], token: match[2] }
}

export function buildBitrix24WebhookUrl(credential: Bitrix24WebhookCredential): string {
  return `https://${credential.portalHost}/rest/${credential.userId}/${credential.token}/`
}

/** Display-safe label that never leaks the webhook token. */
export function bitrix24WebhookLabel(credential: Bitrix24WebhookCredential): string {
  return `${credential.portalHost} · user ${credential.userId}`
}
