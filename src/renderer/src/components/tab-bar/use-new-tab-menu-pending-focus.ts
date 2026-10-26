import { useCallback, useRef } from 'react'
import { focusTerminalTabSurface } from '@/lib/focus-terminal-tab-surface'
import { useAppStore } from '@/store'

const TERMINAL_FOCUS_RETRY_MS = 50
const TERMINAL_FOCUS_TIMEOUT_MS = 5000

export type NewTabMenuPendingFocus = {
  /** Focus the tab that becomes active once the menu closes. */
  queueNewActiveTerminalFocus: () => void
  /** Focus a known terminal tab once the menu closes. */
  queueTerminalTabFocus: (tabId: string) => void
  /** Focus anything once the menu closes; `synchronous` skips the animation frame. */
  queueFocus: (focus: () => void, synchronous?: true) => void
  /** Run the queued focus, if any, after the menu's close animation. */
  runPendingFocusAfterClose: () => void
  /** Cancel the queued focus when the menu's root unmounts. */
  clearPendingFocusOnUnmount: (node: HTMLDivElement | null) => void
}

/**
 * Focus that must wait for the new-tab menu to close.
 *
 * Extracted from the create-menu controller to keep that file under its max-lines budget.
 */
export function useNewTabMenuPendingFocus(): NewTabMenuPendingFocus {
  const pendingFocusRef = useRef<{ focus: () => void; synchronous?: true } | null>(null)
  const animationRef = useRef<number | null>(null)
  const retryRef = useRef<number | null>(null)

  const clearAnimation = useCallback((): void => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const clearRetry = useCallback((): void => {
    if (retryRef.current !== null) {
      window.clearTimeout(retryRef.current)
      retryRef.current = null
    }
  }, [])

  const focusNewActiveTerminalWhenReady = useCallback(
    (previousActiveTabId: string | null, expiresAt: number, now: number): void => {
      const state = useAppStore.getState()
      if (
        (state.activeTabType === 'terminal' || state.activeTabType === 'simulator') &&
        state.activeTabId &&
        state.activeTabId !== previousActiveTabId
      ) {
        focusTerminalTabSurface(state.activeTabId)
        return
      }
      if (now >= expiresAt) {
        return
      }
      retryRef.current = window.setTimeout(() => {
        retryRef.current = null
        focusNewActiveTerminalWhenReady(previousActiveTabId, expiresAt, Date.now())
      }, TERMINAL_FOCUS_RETRY_MS)
    },
    []
  )

  const queueFocus = useCallback(
    (focus: () => void, synchronous?: true): void => {
      clearAnimation()
      clearRetry()
      pendingFocusRef.current = { focus, synchronous }
    },
    [clearAnimation, clearRetry]
  )

  const queueNewActiveTerminalFocus = useCallback((): void => {
    const previousActiveTabId = useAppStore.getState().activeTabId
    queueFocus(() => {
      // Why: paired web/SSH tab creation is async; await the host snapshot's new terminal instead of the pre-existing active tab.
      focusNewActiveTerminalWhenReady(
        previousActiveTabId,
        Date.now() + TERMINAL_FOCUS_TIMEOUT_MS,
        Date.now()
      )
    })
  }, [focusNewActiveTerminalWhenReady, queueFocus])

  const queueTerminalTabFocus = useCallback(
    (tabId: string): void => queueFocus(() => focusTerminalTabSurface(tabId)),
    [queueFocus]
  )

  const runPendingFocusAfterClose = useCallback((): void => {
    const pendingFocus = pendingFocusRef.current
    pendingFocusRef.current = null
    clearAnimation()
    clearRetry()
    if (pendingFocus?.synchronous) {
      pendingFocus.focus()
    } else if (pendingFocus) {
      animationRef.current = requestAnimationFrame(() => {
        animationRef.current = null
        pendingFocus.focus()
      })
    }
  }, [clearAnimation, clearRetry])

  const clearPendingFocusOnUnmount = useCallback(
    (node: HTMLDivElement | null): void => {
      if (node !== null) {
        return
      }
      // Why: cancel the delayed focus handoff via this root ref cleanup, avoiding an otherwise cleanup-only React Effect.
      pendingFocusRef.current = null
      clearAnimation()
      clearRetry()
    },
    [clearAnimation, clearRetry]
  )

  return {
    queueNewActiveTerminalFocus,
    queueTerminalTabFocus,
    queueFocus,
    runPendingFocusAfterClose,
    clearPendingFocusOnUnmount
  }
}
