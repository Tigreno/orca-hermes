import { useAppStore } from '@/store'
import {
  isProvenProcessExit,
  UNVERIFIED_PROCESS_EXIT_CODE
} from '../../../shared/terminal/pty/lifecycle/terminal-exit-cause'

/** Missing wait status means no observed exit; inventing zero would falsely report a clean finish. */
export function runtimeWaitExitCode(wait: { exitCode?: number | null }): number {
  return wait.exitCode ?? UNVERIFIED_PROCESS_EXIT_CODE
}

type BackgroundSessionExitHandlerArgs = {
  tabId: () => string | null
  onExit?: (ptyId: string, code: number) => void
  unsubscribeExit: () => void
  unsubscribeData: () => void
  clearLaunchConfig: () => void
}

/** One exit path per hidden launch: later callbacks (retire, spawn failure) only mark it handled. */
export function createBackgroundSessionExitHandler(args: BackgroundSessionExitHandlerArgs): {
  handleExit: (ptyId: string, code: number) => void
  markHandled: () => void
} {
  let handled = false
  const markHandled = (): void => {
    handled = true
  }
  return {
    markHandled,
    handleExit: (ptyId, code) => {
      if (handled) {
        return
      }
      markHandled()
      args.unsubscribeExit()
      args.unsubscribeData()
      const tabId = args.tabId()
      if (tabId) {
        settleTabPtyBinding(tabId, ptyId, code)
      }
      args.clearLaunchConfig()
      args.onExit?.(ptyId, code)
    }
  }
}

/** Drop tab/PTY identity only on proven exit (as in pty-exit-hibernate); synthetic loss retires transport but preserves reconnect adoption and guards against orphan cleanup. */
export function settleTabPtyBinding(tabId: string, ptyId: string, code: number): void {
  const state = useAppStore.getState()
  if (isProvenProcessExit(code)) {
    state.clearTabPtyId(tabId, ptyId)
    return
  }
  state.markUnverifiedPtyLoss(tabId)
}
