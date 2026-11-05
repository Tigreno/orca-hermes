import type {
  Bitrix24ConnectArgs,
  Bitrix24ConnectionStatus,
  Bitrix24ListTasksArgs
} from '../../shared/bitrix24/connection-types'
import type {
  Bitrix24Project,
  Bitrix24TaskDetail,
  Bitrix24TaskListPage
} from '../../shared/bitrix24/bitrix24-types'
import { connect, disconnect, getStatus, testConnection } from '../bitrix24/client'
import { listProjects } from '../bitrix24/projects'
import { getTask, listTasks } from '../bitrix24/tasks'

type Bitrix24ConnectResult =
  | { ok: true; status: Bitrix24ConnectionStatus }
  | { ok: false; error: string }

export class RuntimeBitrix24Commands {
  bitrix24Connect(args: Bitrix24ConnectArgs): Promise<Bitrix24ConnectResult> {
    return connect(args)
  }

  bitrix24Disconnect(): { ok: true } {
    disconnect()
    return { ok: true }
  }

  bitrix24Status(): Bitrix24ConnectionStatus {
    return getStatus()
  }

  bitrix24TestConnection(): Promise<Bitrix24ConnectResult> {
    return testConnection()
  }

  bitrix24ListProjects(): Promise<Bitrix24Project[]> {
    return listProjects()
  }

  bitrix24ListTasks(args: Bitrix24ListTasksArgs): Promise<Bitrix24TaskListPage> {
    return listTasks(args)
  }

  bitrix24GetTask(taskId: string): Promise<Bitrix24TaskDetail> {
    return getTask(taskId)
  }
}
