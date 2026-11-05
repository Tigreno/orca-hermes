import type {
  Bitrix24ConnectArgs,
  Bitrix24ConnectionStatus,
  Bitrix24ListTasksArgs
} from '../../../shared/bitrix24/connection-types'
import type {
  Bitrix24Project,
  Bitrix24TaskDetail,
  Bitrix24TaskListPage
} from '../../../shared/bitrix24/bitrix24-types'
import type { RuntimeClientTarget } from '../../../shared/runtime-client-target'
import { callRuntimeRpc } from './runtime-rpc-client'

/** Webhook credentials live on the desktop, so Bitrix24 always calls the local runtime. */
const BITRIX24_TARGET: RuntimeClientTarget = { kind: 'local' }

export type Bitrix24ConnectResult =
  | { ok: true; status: Bitrix24ConnectionStatus }
  | { ok: false; error: string }

export async function bitrix24StatusForTarget(
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24ConnectionStatus> {
  return callRuntimeRpc<Bitrix24ConnectionStatus>(target, 'bitrix24.status', undefined, {
    timeoutMs: 15_000
  })
}

export async function bitrix24Connect(
  args: Bitrix24ConnectArgs,
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24ConnectResult> {
  return callRuntimeRpc<Bitrix24ConnectResult>(target, 'bitrix24.connect', args, {
    timeoutMs: 30_000
  })
}

export async function bitrix24Disconnect(
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<{ ok: true }> {
  return callRuntimeRpc<{ ok: true }>(target, 'bitrix24.disconnect', undefined, {
    timeoutMs: 15_000
  })
}

export async function bitrix24TestConnection(
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24ConnectResult> {
  return callRuntimeRpc<Bitrix24ConnectResult>(target, 'bitrix24.testConnection', undefined, {
    timeoutMs: 30_000
  })
}

export async function bitrix24ListProjects(
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24Project[]> {
  return callRuntimeRpc<Bitrix24Project[]>(target, 'bitrix24.listProjects', undefined, {
    timeoutMs: 30_000
  })
}

export async function bitrix24ListTasks(
  args: Bitrix24ListTasksArgs,
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24TaskListPage> {
  return callRuntimeRpc<Bitrix24TaskListPage>(target, 'bitrix24.listTasks', args, {
    timeoutMs: 30_000
  })
}

export async function bitrix24GetTask(
  taskId: string,
  target: RuntimeClientTarget = BITRIX24_TARGET
): Promise<Bitrix24TaskDetail> {
  return callRuntimeRpc<Bitrix24TaskDetail>(
    target,
    'bitrix24.getTask',
    { taskId },
    {
      timeoutMs: 30_000
    }
  )
}
