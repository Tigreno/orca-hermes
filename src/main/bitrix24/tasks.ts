import {
  mapBitrix24TaskRow,
  type Bitrix24TaskDetail,
  type Bitrix24TaskListPage,
  type Bitrix24TaskSummary
} from '../../shared/bitrix24/bitrix24-types'
import type {
  Bitrix24ListTasksArgs,
  Bitrix24UpdateTaskArgs
} from '../../shared/bitrix24/connection-types'
import { bitrix24BbcodeToText } from '../../shared/bitrix24/bbcode'
import { bitrix24Request, getStoredCredential } from './client'
import { Bitrix24ApiError } from './errors'

const TASK_SELECT = [
  'ID',
  'TITLE',
  'STATUS',
  'PRIORITY',
  'RESPONSIBLE_ID',
  'RESPONSIBLE',
  'CREATOR_ID',
  'CREATOR',
  'GROUP_ID',
  'GROUP',
  'DEADLINE',
  'CREATED_DATE',
  'CHANGED_DATE',
  'CLOSED_DATE',
  'TAGS',
  'TIME_ESTIMATE',
  'COMMENTS_COUNT'
] as const

const TASK_LIST_PAGE_SIZE = 50

type Bitrix24TaskFilterRecord = Record<string, unknown>

function buildTaskFilter(args: Bitrix24ListTasksArgs, userId: string): Bitrix24TaskFilterRecord {
  const filter: Bitrix24TaskFilterRecord = {}
  if (args.filter === 'mine') {
    filter.RESPONSIBLE_ID = userId
    filter['!STATUS'] = [5, 7]
  } else if (args.filter === 'completed') {
    filter.STATUS = 5
  }
  if (args.groupId) {
    filter.GROUP_ID = args.groupId
  }
  const query = args.query?.trim()
  if (query) {
    filter['%TITLE'] = query
  }
  return filter
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function collectTaskRows(result: unknown): Record<string, unknown>[] {
  const tasks = isRecord(result) && Array.isArray(result.tasks) ? result.tasks : result
  return (Array.isArray(tasks) ? tasks : []).filter(isRecord)
}

function extractTaskRow(result: unknown): Record<string, unknown> | null {
  const task = isRecord(result) && 'task' in result ? result.task : result
  return isRecord(task) ? task : null
}

function mapTaskDetail(row: Record<string, unknown>, portalHost: string): Bitrix24TaskDetail {
  const summary: Bitrix24TaskSummary = mapBitrix24TaskRow(row, portalHost)
  const descriptionBbcode = typeof row.description === 'string' ? row.description : ''
  return {
    ...summary,
    descriptionBbcode,
    descriptionText: bitrix24BbcodeToText(descriptionBbcode)
  }
}

export async function listTasks(args: Bitrix24ListTasksArgs): Promise<Bitrix24TaskListPage> {
  const credential = getStoredCredential()
  const { result, next, total } = await bitrix24Request<unknown>('tasks.task.list', {
    filter: buildTaskFilter(args, credential.userId),
    select: TASK_SELECT,
    start: args.start ?? 0,
    limit: TASK_LIST_PAGE_SIZE
  })
  return {
    tasks: collectTaskRows(result).map((row) => mapBitrix24TaskRow(row, credential.portalHost)),
    next: typeof next === 'number' ? next : null,
    total: typeof total === 'number' ? total : null
  }
}

export async function getTask(taskId: string): Promise<Bitrix24TaskDetail> {
  const credential = getStoredCredential()
  const { result } = await bitrix24Request<unknown>('tasks.task.get', { taskId })
  const row = extractTaskRow(result)
  if (!row) {
    throw new Bitrix24ApiError(
      'tasks.task.get',
      'task_not_found',
      'Bitrix24 task was not found.',
      200
    )
  }
  return mapTaskDetail(row, credential.portalHost)
}

export async function updateTask(args: Bitrix24UpdateTaskArgs): Promise<Bitrix24TaskDetail> {
  const credential = getStoredCredential()
  const fields: Record<string, unknown> = {}
  if (args.groupId !== undefined) {
    fields.GROUP_ID = args.groupId === null ? 0 : parseGroupId(args.groupId)
  }
  if (args.deadline !== undefined) {
    fields.DEADLINE = args.deadline ?? ''
  }
  const { result } = await bitrix24Request<unknown>('tasks.task.update', {
    taskId: args.taskId,
    fields
  })
  const row = extractTaskRow(result)
  if (!row) {
    throw new Bitrix24ApiError(
      'tasks.task.update',
      'task_not_found',
      'Bitrix24 task was not found.',
      200
    )
  }
  return mapTaskDetail(row, credential.portalHost)
}

function parseGroupId(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value
}
