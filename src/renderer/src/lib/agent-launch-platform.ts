// Why: the renderer runs with contextIsolation, so `process.platform` does not exist here;
// reading it threw on every custom-agent launch. SSH targets carry their own platform from
// the connection state, so this only has to answer for a local workspace — this client's OS.
import { CLIENT_PLATFORM } from '@/lib/new-workspace'
import type { ProjectExecutionRuntimeResolution } from '../../../shared/project-execution-runtime'

/**
 * The runtime's host OS as a Node platform name; `wsl` and unknown hosts answer `undefined`.
 *
 * Why a switch: the host OS arrives as a plain string, and a Node platform is a closed union —
 * a switch over the known arms keeps that narrowing without a type assertion.
 */
export function nodePlatformFromHostPlatform(hostPlatform: string): NodeJS.Platform | undefined {
  switch (hostPlatform) {
    case 'aix':
    case 'android':
    case 'darwin':
    case 'freebsd':
    case 'haiku':
    case 'linux':
    case 'openbsd':
    case 'sunos':
    case 'win32':
    case 'cygwin':
    case 'netbsd':
      return hostPlatform
    default:
      return undefined
  }
}

/** The launch platform a resolved local project runtime implies. */
export function nodePlatformFromProjectRuntime(
  runtime: ProjectExecutionRuntimeResolution | undefined
): NodeJS.Platform | undefined {
  if (runtime?.status !== 'resolved') {
    return undefined
  }
  return nodePlatformFromHostPlatform(runtime.runtime.hostPlatform)
}

export function getAgentLaunchPlatformForRepo(
  _repo: unknown,
  fallback: NodeJS.Platform | undefined
): NodeJS.Platform {
  return fallback ?? CLIENT_PLATFORM
}
