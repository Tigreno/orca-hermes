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
import type { Bitrix24ProjectReference } from '../../shared/bitrix24/project-reference'
import { connect, disconnect, getStatus, testConnection } from '../bitrix24/client'
import { listProjects } from '../bitrix24/projects'
import { readRepoProjectBindings, setRepoProjectBinding } from '../bitrix24/repo-project-bindings'
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

  bitrix24RepoProjectBindings(): Record<string, Bitrix24ProjectReference> {
    return readRepoProjectBindings()
  }

  bitrix24SetRepoProjectBinding(args: {
    repoId: string
    hostId: string
    project: unknown
  }): Bitrix24ProjectReference | null {
    return setRepoProjectBinding(args)
  }
}
