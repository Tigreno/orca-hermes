import { defineMethod } from '../core'
import {
  Bitrix24Connect,
  Bitrix24ListTasks,
  Bitrix24TaskId
} from '../../../../shared/rpc-contract/bitrix24-params'

export const BITRIX24_METHODS = [
  defineMethod({
    name: 'bitrix24.connect',
    permission: 'accounts-admin',
    params: Bitrix24Connect,
    handler: async (params, { runtime }) =>
      runtime.bitrix24Connect({ webhookUrl: params.webhookUrl.trim() })
  }),
  defineMethod({
    name: 'bitrix24.disconnect',
    permission: 'accounts-admin',
    params: null,
    handler: async (_params, { runtime }) => runtime.bitrix24Disconnect()
  }),
  defineMethod({
    name: 'bitrix24.status',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.bitrix24Status()
  }),
  defineMethod({
    name: 'bitrix24.testConnection',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.bitrix24TestConnection()
  }),
  defineMethod({
    name: 'bitrix24.listProjects',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.bitrix24ListProjects()
  }),
  defineMethod({
    name: 'bitrix24.listTasks',
    permission: 'workspace',
    params: Bitrix24ListTasks,
    handler: async (params, { runtime }) =>
      runtime.bitrix24ListTasks({
        filter: params.filter,
        groupId: params.groupId,
        query: params.query,
        start: params.start,
        portalHost: params.portalHost
      })
  }),
  defineMethod({
    name: 'bitrix24.getTask',
    permission: 'workspace',
    params: Bitrix24TaskId,
    handler: async (params, { runtime }) => runtime.bitrix24GetTask(params.taskId.trim())
  })
]
