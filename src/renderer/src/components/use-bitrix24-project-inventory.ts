import { useEffect, useState } from 'react'
import type { Bitrix24Project } from '../../../shared/bitrix24/bitrix24-types'
import { useBitrix24ConnectionStatus } from '@/hooks/use-bitrix24-connection-status'
import { bitrix24ListProjects } from '@/runtime/runtime-bitrix24-client'

type Inventory = {
  portalHost: string | null
  projects: Bitrix24Project[]
  error: string | null
}

export function useBitrix24ProjectInventory(enabled: boolean): {
  projects: Bitrix24Project[]
  portalHost: string | null
  connected: boolean
  error: string | null
  loading: boolean
} {
  const connection = useBitrix24ConnectionStatus()
  const portalHost = connection.status?.portalHost ?? null
  const connected = connection.status?.connected === true
  const [inventory, setInventory] = useState<Inventory | null>(null)

  useEffect(() => {
    if (!enabled || !connected || !portalHost) {
      return
    }
    let cancelled = false
    void bitrix24ListProjects()
      .then((projects) => {
        if (!cancelled) {
          setInventory({ portalHost, projects, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInventory({
            portalHost,
            projects: [],
            error: error instanceof Error ? error.message : String(error)
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [connected, enabled, portalHost])

  const current = inventory?.portalHost === portalHost ? inventory : null
  return {
    projects: current?.projects ?? [],
    portalHost,
    connected,
    error: current?.error ?? connection.error,
    loading: enabled && connected && current === null
  }
}
