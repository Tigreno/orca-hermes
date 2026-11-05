export type Bitrix24ProjectReference = {
  /** Portal host without protocol or trailing slash, e.g. `ckmf.bitrix24.ru`. */
  portalHost: string
  groupId: string
  groupName: string
}

export function normalizeBitrix24ProjectReference(
  value: unknown
): Bitrix24ProjectReference | null | undefined {
  if (value === null) {
    return null
  }
  if (!value || typeof value !== 'object' || !('portalHost' in value) || !('groupId' in value)) {
    return undefined
  }
  const { portalHost, groupId, groupName } = value as Record<string, unknown>
  const normalizedHost = normalizePortalHost(portalHost)
  const normalizedGroupId = normalizeNonEmptyString(groupId)
  const normalizedGroupName = normalizeNonEmptyString(groupName)
  if (!normalizedHost || !normalizedGroupId || !normalizedGroupName) {
    return undefined
  }
  return {
    portalHost: normalizedHost,
    groupId: normalizedGroupId,
    groupName: normalizedGroupName
  }
}

export function normalizePortalHost(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
  return trimmed || null
}

function normalizeNonEmptyString(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed ? trimmed : null
}
