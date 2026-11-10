import { ExternalLink, LoaderCircle, RefreshCw, X } from 'lucide-react'
import { Bitrix24ConnectDialog } from '@/components/bitrix24-connect-dialog'
import { Bitrix24Icon } from '@/components/icons/Bitrix24Icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { openAppHttpLink } from '@/lib/app-http-link-open'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useRepoById } from '@/store/selectors'
import type {
  Bitrix24TaskFilter,
  Bitrix24TaskSummary
} from '../../../../shared/bitrix24/bitrix24-types'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '../task-page/task-page-source-context'
import { Bitrix24TaskDetail } from '../task-page/bitrix24/Detail'
import {
  Bitrix24TaskPageProvider,
  useBitrix24TaskPage
} from '../task-page/bitrix24/task-page-bitrix24-context'
import {
  getBitrix24StatusLabel,
  getBitrix24StatusTone
} from '../task-page/bitrix24/task-page-bitrix24-status'

const FILTERS: readonly Bitrix24TaskFilter[] = ['mine', 'all', 'completed']

function filterLabel(filter: Bitrix24TaskFilter): string {
  switch (filter) {
    case 'mine':
      return translate('components.bitrix24Filters.mine', 'My tasks')
    case 'all':
      return translate('components.bitrix24Filters.all', 'All tasks')
    case 'completed':
      return translate('components.bitrix24Filters.completed', 'Completed')
  }
}

function SidebarTaskRow({
  task,
  onOpen
}: {
  task: Bitrix24TaskSummary
  onOpen: () => void
}): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="group flex w-full cursor-pointer flex-col gap-1 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">#{task.id}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            openAppHttpLink(task.url, { event })
          }}
          aria-label={translate('components.bitrix24TaskList.openInBitrix24', 'Open in Bitrix24')}
        >
          <ExternalLink className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span
          className={cn(
            'rounded-full border px-1.5 py-0.5 font-medium',
            getBitrix24StatusTone(task.status)
          )}
        >
          {getBitrix24StatusLabel(task.status)}
        </span>
        {task.changedDate ? <span>{formatRelativeTime(task.changedDate)}</span> : null}
      </div>
    </div>
  )
}

function Bitrix24TasksPanelBody(): React.JSX.Element {
  const {
    checking,
    connected,
    connectOpen,
    connectionError,
    error,
    filter,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    openTask,
    refresh,
    scope,
    searchInput,
    selectedTaskId,
    setConnectOpen,
    setFilter,
    setSearchInput,
    submitSearch,
    clearSearch,
    tasks
  } = useBitrix24TaskPage()

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!connected) {
    return (
      <>
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <Bitrix24Icon className="mb-3 size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">
            {translate('components.bitrix24TaskList.connectTitle', 'Connect Bitrix24')}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {translate(
              'components.bitrix24TaskList.connectDescription',
              'Browse tasks from your Bitrix24 projects and start workspaces from them.'
            )}
          </p>
          <Button className="mt-4" size="sm" onClick={() => setConnectOpen(true)}>
            {translate('components.bitrix24TaskList.connectAction', 'Connect Bitrix24')}
          </Button>
        </div>
        <Bitrix24ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <Bitrix24Icon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{scope?.project.groupName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{scope?.project.portalHost}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={refresh}
              aria-label={translate('components.bitrix24Filters.refresh', 'Refresh tasks')}
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {translate('components.bitrix24Filters.refresh', 'Refresh tasks')}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-2 border-b border-border/50 px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((entry) => {
            const active = filter === entry
            return (
              <button
                key={entry}
                type="button"
                onClick={() => setFilter(entry)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                  active
                    ? 'border-border/50 bg-foreground/90 text-background'
                    : 'border-border/50 bg-transparent text-foreground hover:bg-muted/50'
                )}
              >
                {filterLabel(entry)}
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitSearch()
              }
            }}
            placeholder={translate('components.bitrix24Filters.search', 'Search title')}
            aria-label={translate('components.bitrix24Filters.search', 'Search title')}
            density="compact"
            adornment="trailing"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={translate('components.bitrix24Filters.clearSearch', 'Clear search')}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek">
        {connectionError ? (
          <div role="alert" className="border-b border-border px-3 py-2 text-xs text-destructive">
            {connectionError}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="border-b border-border px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
        {loading && tasks.length === 0 ? (
          <div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 border-b border-border/50 px-3 py-2">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/70" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : null}
        {!loading && tasks.length === 0 && !error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {translate('components.bitrix24TaskList.emptyTitle', 'No Bitrix24 tasks')}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {scope
                ? translate(
                    'components.bitrix24TaskList.emptyInProject',
                    'Nothing matches in {{name}}.',
                    { name: scope.project.groupName }
                  )
                : translate(
                    'components.bitrix24TaskList.emptyDescription',
                    'Nothing matches the current filter.'
                  )}
            </p>
          </div>
        ) : null}
        {tasks.map((task) => (
          <SidebarTaskRow
            key={task.id}
            task={task}
            onOpen={() => {
              useAppStore.getState().recordFeatureInteraction('tasks')
              openTask(task)
            }}
          />
        ))}
        {hasMore ? (
          <div className="flex justify-center border-t border-border/50 px-3 py-2">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                  {translate('components.bitrix24TaskList.loadingMore', 'Loading...')}
                </>
              ) : (
                translate('components.bitrix24TaskList.loadMore', 'Load more')
              )}
            </Button>
          </div>
        ) : null}
      </div>
      {selectedTaskId !== null ? <Bitrix24TaskDetail /> : null}
    </div>
  )
}

export default function Bitrix24TasksPanel(): React.JSX.Element {
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const repoId = useAppStore((s) =>
    activeWorktreeId ? (s.getKnownWorktreeById(activeWorktreeId)?.repoId ?? null) : null
  )
  const repo = useRepoById(repoId)
  const scopeRepo = repo?.defaultBitrix24Project ? repo : null

  if (!scopeRepo) {
    return (
      <div className="flex flex-col items-center px-4 py-12 text-center">
        <Bitrix24Icon className="mb-3 size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">
          {translate('components.bitrix24Sidebar.noProjectTitle', 'No Bitrix24 project')}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {translate(
            'components.bitrix24Sidebar.noProjectDescription',
            'Choose a default Bitrix24 project for this repo in settings to see its tasks here.'
          )}
        </p>
      </div>
    )
  }

  return (
    <Bitrix24TaskPageProvider scopeRepo={scopeRepo}>
      <Bitrix24TasksPanelBody />
    </Bitrix24TaskPageProvider>
  )
}
