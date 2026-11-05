import type { Bitrix24Project } from '../../shared/bitrix24/bitrix24-types'
import { bitrix24Request } from './client'

const SONET_GROUP_SELECT = [
  'ID',
  'NAME',
  'ACTIVE',
  'PROJECT',
  'VISIBLE',
  'OPENED',
  'CLOSED'
] as const

type SonetGroupRow = Record<string, unknown>

function isRecord(value: unknown): value is SonetGroupRow {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

/** Webhook may expose workgroups the current user cannot see in the portal UI. */
export async function listProjects(): Promise<Bitrix24Project[]> {
  const { result } = await bitrix24Request<unknown>('sonet_group.get', {
    filter: { ACTIVE: 'Y' },
    select: SONET_GROUP_SELECT
  })
  if (!Array.isArray(result)) {
    return []
  }
  return result.flatMap((row) => {
    if (!isRecord(row)) {
      return []
    }
    const record = row
    const id = normalizeString(record.ID) ?? normalizeString(record.id)
    const name = normalizeString(record.NAME) ?? normalizeString(record.name)
    return id && name ? [{ id, name }] : []
  })
}
