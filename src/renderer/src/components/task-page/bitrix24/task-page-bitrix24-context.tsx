import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Repo } from '../../../../../shared/repo-types'
import type {
  Bitrix24TaskDetail,
  Bitrix24TaskFilter,
  Bitrix24TaskSummary
} from '../../../../../shared/bitrix24/bitrix24-types'
import type { Bitrix24ProjectReference } from '../../../../../shared/bitrix24/project-reference'
import { buildTaskSourceContextFromRepo } from '../../../../../shared/task-source-context'
import { getLinkedWorkItemSuggestedName } from '../../../../../shared/workspace-name'
import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import { getRepoWorkspaceCreationTargetHint } from '@/lib/project-host-workspace-target'
import {
  refreshBitrix24ConnectionStatus,
  useBitrix24ConnectionStatus
} from '@/hooks/use-bitrix24-connection-status'
import { bitrix24GetTask, bitrix24ListTasks } from '@/runtime/runtime-bitrix24-client'
import { useAppStore } from '@/store/index'
import type { TaskPageComposerActionsModel } from '../use-task-page-composer-actions'

type Bitrix24Scope = {
  repo: Repo
  project: Bitrix24ProjectReference
}

export type Bitrix24TaskPageState = {
  connected: boolean
  checking: boolean
  connectionError: string | null
  scope: Bitrix24Scope | null
  filter: Bitrix24TaskFilter
  setFilter: (filter: Bitrix24TaskFilter) => void
  searchInput: string
  setSearchInput: (value: string) => void
  submitSearch: () => void
  clearSearch: () => void
  tasks: Bitrix24TaskSummary[]
  total: number | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  refresh: () => void
  loadMore: () => void
  selectedTask: Bitrix24TaskDetail | null
  selectedTaskId: string | null
  detailLoading: boolean
  detailError: string | null
  openTask: (task: Bitrix24TaskSummary) => void
  closeTask: () => void
  startWorkspace: (task: Bitrix24TaskSummary) => void
  connectOpen: boolean
  setConnectOpen: (open: boolean) => void
}

const Bitrix24TaskPageContext = createContext<Bitrix24TaskPageState | null>(null)

function findScope(repos: readonly Repo[]): Bitrix24Scope | null {
  for (const repo of repos) {
    if (repo.defaultBitrix24Project) {
      return { repo, project: repo.defaultBitrix24Project }
    }
  }
  return null
}

export function Bitrix24TaskPageProvider({
  model,
  children
}: {
  model: TaskPageComposerActionsModel
  children: React.ReactNode
}): React.JSX.Element {
  const connection = useBitrix24ConnectionStatus()
  const active = model.taskSource === 'bitrix24'
  const connected = active && connection.status?.connected === true
  const checking = active && connection.checking
  const scope = useMemo(() => findScope(model.selectedRepos), [model.selectedRepos])

  const [filter, setFilter] = useState<Bitrix24TaskFilter>('mine')
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [tasks, setTasks] = useState<Bitrix24TaskSummary[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [next, setNext] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Bitrix24TaskDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const requestIdRef = useRef(0)

  const groupId = scope?.project.groupId ?? null
  const scopePortalHost = scope?.project.portalHost ?? null

  useEffect(() => {
    if (!active) {
      return
    }
    void refreshBitrix24ConnectionStatus()
  }, [active])

  useEffect(() => {
    if (!connected) {
      setTasks([])
      setTotal(null)
      setNext(null)
      setError(null)
      setLoading(false)
      return
    }
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    void bitrix24ListTasks({
      filter,
      groupId,
      query: appliedQuery || null,
      start: 0,
      portalHost: scopePortalHost
    })
      .then((page) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setTasks(page.tasks)
        setNext(page.next)
        setTotal(page.total)
      })
      .catch((caught: unknown) => {
        if (requestId !== requestIdRef.current) {
          return
        }
        setTasks([])
        setNext(null)
        setTotal(null)
        setError(caught instanceof Error ? caught.message : String(caught))
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      })
  }, [appliedQuery, connected, filter, groupId, refreshNonce, scopePortalHost])

  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTask(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    void bitrix24GetTask(selectedTaskId)
      .then((task) => {
        if (!cancelled) {
          setSelectedTask(task)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setSelectedTask(null)
          setDetailError(caught instanceof Error ? caught.message : String(caught))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedTaskId])

  const submitSearch = useCallback(() => {
    setAppliedQuery(searchInput.trim())
  }, [searchInput])

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedQuery(searchInput.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    setAppliedQuery('')
  }, [])

  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), [])

  const loadMore = useCallback(() => {
    if (!connected || next === null || loadingMore || loading) {
      return
    }
    setLoadingMore(true)
    void bitrix24ListTasks({
      filter,
      groupId,
      query: appliedQuery || null,
      start: next,
      portalHost: scopePortalHost
    })
      .then((page) => {
        setTasks((current) => {
          const seen = new Set(current.map((task) => task.id))
          return [...current, ...page.tasks.filter((task) => !seen.has(task.id))]
        })
        setNext(page.next)
        setTotal(page.total)
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : String(caught))
      })
      .finally(() => setLoadingMore(false))
  }, [appliedQuery, connected, filter, groupId, loading, loadingMore, next, scopePortalHost])

  const openTask = useCallback((task: Bitrix24TaskSummary) => {
    setSelectedTaskId(task.id)
  }, [])

  const closeTask = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  const startWorkspace = useCallback(
    (task: Bitrix24TaskSummary) => {
      const repo = scope?.repo ?? model.selectedRepos[0] ?? null
      const linkedWorkItem: LinkedWorkItemSummary = {
        type: 'issue',
        provider: 'bitrix24',
        number: 0,
        title: task.title,
        url: task.url,
        bitrix24Identifier: task.id
      }
      const projectHostSetups = useAppStore.getState().projectHostSetups
      const taskSourceContext =
        repo && scope
          ? buildTaskSourceContextFromRepo({
              provider: 'bitrix24',
              projectId: `${scope.project.portalHost}/${scope.project.groupId}`,
              repo,
              providerIdentity: {
                provider: 'bitrix24',
                portalHost: scope.project.portalHost,
                userId: connection.status?.userId ?? null,
                groupId: scope.project.groupId
              },
              accountLabel: scope.project.portalHost
            })
          : null
      useAppStore.getState().recordFeatureInteraction?.('tasks')
      model.openModal('new-workspace-composer', {
        linkedWorkItem,
        ...(taskSourceContext ? { taskSourceContext } : {}),
        initialRepoId: repo?.id,
        initialWorkspaceTarget: repo
          ? getRepoWorkspaceCreationTargetHint(repo, projectHostSetups)
          : undefined,
        prefilledName: getLinkedWorkItemSuggestedName(task),
        telemetrySource: 'sidebar'
      })
    },
    [connection.status?.userId, model, scope]
  )

  const value: Bitrix24TaskPageState = useMemo(
    () => ({
      connected,
      checking,
      connectionError: connection.error,
      scope,
      filter,
      setFilter,
      searchInput,
      setSearchInput,
      submitSearch,
      clearSearch,
      tasks,
      total,
      loading,
      loadingMore,
      error,
      hasMore: next !== null,
      refresh,
      loadMore,
      selectedTask,
      selectedTaskId,
      detailLoading,
      detailError,
      openTask,
      closeTask,
      startWorkspace,
      connectOpen,
      setConnectOpen
    }),
    [
      checking,
      clearSearch,
      closeTask,
      connectOpen,
      connected,
      connection.error,
      detailError,
      detailLoading,
      error,
      filter,
      loadMore,
      loading,
      loadingMore,
      next,
      openTask,
      refresh,
      scope,
      searchInput,
      selectedTask,
      selectedTaskId,
      startWorkspace,
      submitSearch,
      tasks,
      total
    ]
  )

  return (
    <Bitrix24TaskPageContext.Provider value={value}>{children}</Bitrix24TaskPageContext.Provider>
  )
}

export function useBitrix24TaskPage(): Bitrix24TaskPageState {
  const value = useContext(Bitrix24TaskPageContext)
  if (!value) {
    throw new Error('useBitrix24TaskPage must be used inside Bitrix24TaskPageProvider')
  }
  return value
}
