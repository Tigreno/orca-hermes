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
