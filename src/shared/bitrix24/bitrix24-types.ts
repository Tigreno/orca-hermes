export const BITRIX24_TASK_STATUSES = [1, 2, 3, 4, 5, 6, 7] as const
export const BITRIX24_TASK_PRIORITIES = [0, 1, 2] as const

export type Bitrix24TaskStatus = (typeof BITRIX24_TASK_STATUSES)[number]
export type Bitrix24TaskPriority = (typeof BITRIX24_TASK_PRIORITIES)[number]
export type Bitrix24TaskFilter = 'mine' | 'all' | 'completed'

export type Bitrix24TaskUser = {
  id: string
  name: string
  workPosition?: string | null
}

export type Bitrix24TaskGroup = {
  id: string
  name: string
}

export type Bitrix24TaskSummary = {
  id: string
  title: string
  status: Bitrix24TaskStatus
  priority: Bitrix24TaskPriority
  responsible: Bitrix24TaskUser | null
  creator: Bitrix24TaskUser | null
  group: Bitrix24TaskGroup | null
  deadline: string | null
  createdDate: string | null
  changedDate: string | null
  closedDate: string | null
  tags: string[]
  commentsCount: number | null
  url: string
}

export type Bitrix24TaskDetail = Bitrix24TaskSummary & {
  descriptionBbcode: string
  descriptionText: string
}

export type Bitrix24Project = {
  id: string
  name: string
}

export type Bitrix24TaskListPage = {
  tasks: Bitrix24TaskSummary[]
  next: number | null
  total: number | null
}

export type Bitrix24RestTaskRow = Record<string, unknown>

/** REST may return numbers as strings; keep one narrow parser for every numeric field. */
export function parseBitrix24Number(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function isBitrix24TaskStatus(value: unknown): value is Bitrix24TaskStatus {
  return BITRIX24_TASK_STATUSES.some((status) => status === value)
}

export function isBitrix24TaskFilter(value: unknown): value is Bitrix24TaskFilter {
  return value === 'mine' || value === 'all' || value === 'completed'
}

export function mapBitrix24TaskRow(
  row: Bitrix24RestTaskRow,
  portalHost: string
): Bitrix24TaskSummary {
  const id = normalizeString(row.id) ?? ''
  const status = parseBitrix24Number(row.status)
  const priority = parseBitrix24Number(row.priority)
  const group = normalizeGroup(row.group, row.groupId)
  const responsible = normalizeUser(row.responsible, row.responsibleId)
  return {
    id,
    title: normalizeString(row.title) ?? '',
    status: isBitrix24TaskStatus(status) ? status : 1,
    priority: priority === 0 || priority === 2 ? priority : 1,
    responsible,
    creator: normalizeUser(row.creator, row.createdBy),
    group: group && group.id !== '0' ? group : null,
    deadline: normalizeString(row.deadline),
    createdDate: normalizeString(row.createdDate),
    changedDate: normalizeString(row.changedDate),
    closedDate: normalizeString(row.closedDate),
    tags: normalizeTags(row.tags),
    commentsCount: parseBitrix24Number(row.commentsCount),
    url: buildBitrix24TaskUrl({
      portalHost,
      taskId: id,
      groupId: group?.id ?? null,
      responsibleId: responsible?.id ?? null
    })
  }
}

export function buildBitrix24TaskUrl(args: {
  portalHost: string
  taskId: string
  groupId?: string | null
  responsibleId?: string | null
}): string {
  const base = `https://${args.portalHost}`
  if (args.groupId && args.groupId !== '0') {
    return `${base}/workgroups/group/${args.groupId}/tasks/task/view/${args.taskId}/`
  }
  if (args.responsibleId) {
    return `${base}/company/personal/user/${args.responsibleId}/tasks/task/view/${args.taskId}/`
  }
  return `${base}/tasks/task/view/${args.taskId}/`
}

function normalizeUser(value: unknown, fallbackId: unknown): Bitrix24TaskUser | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const id = normalizeString(record.id) ?? normalizeString(fallbackId)
    const name = normalizeString(record.name)
    if (id && name) {
      return {
        id,
        name,
        workPosition: normalizeString(record.workPosition)
      }
    }
  }
  const id = normalizeString(fallbackId)
  return id ? { id, name: id } : null
}

function normalizeGroup(value: unknown, fallbackId: unknown): Bitrix24TaskGroup | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const id = normalizeString(record.id) ?? normalizeString(fallbackId)
    const name = normalizeString(record.name)
    if (id) {
      return { id, name: name ?? id }
    }
  }
  const id = normalizeString(fallbackId)
  return id ? { id, name: id } : null
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    const tag = normalizeString(entry)
    return tag ? [tag] : []
  })
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
