import { z } from 'zod'
import { OptionalPositiveInt, OptionalString, requiredString } from './rpc-param-primitives'

export const BITRIX24_TASK_FILTERS = ['mine', 'all', 'completed'] as const

export const Bitrix24Connect = z.object({
  webhookUrl: requiredString('Bitrix24 webhook URL is required')
})

export const Bitrix24ListTasks = z.object({
  filter: z.enum(BITRIX24_TASK_FILTERS),
  groupId: OptionalString,
  query: OptionalString,
  start: OptionalPositiveInt,
  portalHost: OptionalString
})

export const Bitrix24TaskId = z.object({
  taskId: requiredString('Bitrix24 task ID is required')
})
