import { useEffect, useState } from 'react'
import type { Bitrix24ConnectionStatus } from '../../../shared/bitrix24/connection-types'
import { bitrix24StatusForTarget } from '@/runtime/runtime-bitrix24-client'

export type Bitrix24ConnectionState = {
  status: Bitrix24ConnectionStatus | null
  checking: boolean
  error: string | null
}

const INITIAL_STATE: Bitrix24ConnectionState = { status: null, checking: true, error: null }

let sharedState = INITIAL_STATE
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function publish(next: Bitrix24ConnectionState): void {
  sharedState = next
  for (const listener of listeners) {
    listener()
  }
}

export async function refreshBitrix24ConnectionStatus(): Promise<void> {
  if (inFlight) {
    return inFlight
  }
  publish({ ...sharedState, checking: true, error: null })
  inFlight = bitrix24StatusForTarget()
    .then((status) => publish({ status, checking: false, error: null }))
    .catch((error: unknown) =>
      publish({
        status: sharedState.status,
        checking: false,
        error: error instanceof Error ? error.message : 'Could not read Bitrix24 status.'
      })
    )
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Local-only status shared by Settings and the Tasks setup hub. */
export function useBitrix24ConnectionStatus(): Bitrix24ConnectionState {
  const [state, setState] = useState(sharedState)
  useEffect(() => {
    const sync = (): void => setState(sharedState)
    listeners.add(sync)
    sync()
    if (sharedState.status === null && !inFlight) {
      void refreshBitrix24ConnectionStatus()
    }
    return () => {
      listeners.delete(sync)
    }
  }, [])
  return state
}
