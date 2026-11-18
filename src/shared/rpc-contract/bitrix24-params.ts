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

// Three update meanings: undefined leaves unchanged, null clears, string sets.
const OptionalNullableString = z
  .unknown()
  .transform((value) => {
    if (value === null) {
      return null
    }
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    return undefined
  })
  .pipe(z.union([z.string(), z.null(), z.undefined()]))
  .optional()

export const Bitrix24UpdateTask = z.object({
  taskId: requiredString('Bitrix24 task ID is required'),
  groupId: OptionalNullableString,
  deadline: OptionalNullableString
})

export const Bitrix24RepoProjectBinding = z.object({
  repoId: requiredString('Bitrix24 repo id is required'),
  hostId: requiredString('Bitrix24 host id is required'),
  project: z.unknown()
})
