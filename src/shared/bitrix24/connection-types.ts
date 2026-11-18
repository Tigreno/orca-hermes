import type { Bitrix24TaskFilter } from './bitrix24-types'

export type Bitrix24ConnectionStatus = {
  connected: boolean
  portalHost: string | null
  userId: string | null
  scopes: string[]
  error: string | null
}

export type Bitrix24ConnectArgs = {
  webhookUrl: string
}

export type Bitrix24ListTasksArgs = {
  filter: Bitrix24TaskFilter
  groupId?: string | null
  query?: string | null
  start?: number
  portalHost?: string | null
}

export type Bitrix24TaskUpdateFields = {
  /** Omit to leave unchanged; null moves the task out of its project. */
  groupId?: string | null
  /** Omit to leave unchanged; null clears the deadline. */
  deadline?: string | null
}

export type Bitrix24UpdateTaskArgs = Bitrix24TaskUpdateFields & {
  taskId: string
}
