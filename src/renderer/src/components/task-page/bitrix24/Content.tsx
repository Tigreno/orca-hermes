import { ArrowRight, ExternalLink, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Bitrix24Icon } from '@/components/icons/Bitrix24Icon'
import { Bitrix24ConnectDialog } from '@/components/bitrix24-connect-dialog'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { openAppHttpLink } from '@/lib/app-http-link-open'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { Bitrix24TaskSummary } from '../../../../../shared/bitrix24/bitrix24-types'
import { formatRelativeTime } from '../task-page-source-context'
import { Bitrix24TaskDetail } from './Detail'
import { useBitrix24TaskPage } from './task-page-bitrix24-context'
import { getBitrix24StatusLabel, getBitrix24StatusTone } from './task-page-bitrix24-status'

const GRID_COLUMNS = 'grid-cols-[56px_minmax(0,3fr)_120px_120px_50px]'

function TaskRow({
  task,
  onOpen,
  onStart
}: {
  task: Bitrix24TaskSummary
  onOpen: () => void
  onStart: () => void
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
      className={`grid w-full cursor-pointer gap-3 px-3 py-2 text-left ${GRID_COLUMNS} hover:bg-muted/50`}
    >
      <span className="font-mono text-xs text-muted-foreground">#{task.id}</span>
      <span className="min-w-0 truncate text-sm">{task.title}</span>
      <span
        className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium ${getBitrix24StatusTone(
          task.status
        )}`}
      >
        {getBitrix24StatusLabel(task.status)}
      </span>
      <span className="text-xs text-muted-foreground">
        {task.changedDate ? formatRelativeTime(task.changedDate) : '—'}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              data-contextual-tour-target="tasks-start-workspace"
              onClick={(event) => {
                event.stopPropagation()
                onStart()
              }}
              aria-label={translate(
                'components.bitrix24TaskList.startWorkspace',
                'Start workspace'
              )}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {translate('components.bitrix24TaskList.startWorkspace', 'Start workspace')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(event) => {
                event.stopPropagation()
                openAppHttpLink(task.url, { event })
              }}
              aria-label={translate(
                'components.bitrix24TaskList.openInBitrix24',
                'Open in Bitrix24'
              )}
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6}>
            {translate('components.bitrix24TaskList.openInBitrix24', 'Open in Bitrix24')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export function TaskPageBitrix24Content(): React.JSX.Element {
  const {
    checking,
    connected,
    connectOpen,
    connectionError,
    error,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    openTask,
    scope,
    selectedTaskId,
    setConnectOpen,
    startWorkspace,
    tasks
  } = useBitrix24TaskPage()

  if (checking) {
    return (
      <div className="mt-4 flex items-center justify-center py-14">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!connected) {
    return (
      <>
        <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
          <Bitrix24Icon className="mb-4 size-8 text-muted-foreground/60" />
          <p className="text-base font-medium text-foreground">
            {translate('components.bitrix24TaskList.connectTitle', 'Connect Bitrix24')}
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {translate(
              'components.bitrix24TaskList.connectDescription',
              'Browse tasks from your Bitrix24 projects and start workspaces from them.'
            )}
          </p>
          <Button className="mt-5" onClick={() => setConnectOpen(true)}>
            {translate('components.bitrix24TaskList.connectAction', 'Connect Bitrix24')}
          </Button>
        </div>
        <Bitrix24ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    )
  }

  return (
    <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-muted/50 shadow-sm">
      <div
        className={`flex-none grid gap-3 border-b border-border/50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground ${GRID_COLUMNS}`}
      >
        <span>{translate('components.bitrix24TaskList.id', 'ID')}</span>
        <span>{translate('components.bitrix24TaskList.title', 'Title')}</span>
        <span>{translate('components.bitrix24TaskList.status', 'Status')}</span>
        <span>{translate('components.bitrix24TaskList.updated', 'Updated')}</span>
        <span />
      </div>
      <div className="min-h-0 flex-initial overflow-y-auto scrollbar-sleek">
        {connectionError ? (
          <div role="alert" className="border-b border-border px-4 py-3 text-sm text-destructive">
            {connectionError}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="border-b border-border px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {loading && tasks.length === 0 ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className={`grid w-full gap-3 px-3 py-2 ${GRID_COLUMNS}`}>
                <div className="h-4 w-10 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted/70" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
                <div />
              </div>
            ))}
          </div>
        ) : null}
        {!loading && tasks.length === 0 && !error ? (
          <div className="px-4 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              {translate('components.bitrix24TaskList.emptyTitle', 'No Bitrix24 tasks')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
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
        <div className="divide-y divide-border/50">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={() => {
                useAppStore.getState().recordFeatureInteraction('tasks')
                openTask(task)
              }}
              onStart={() => {
                try {
                  startWorkspace(task)
                } catch (caught) {
                  toast.error(
                    caught instanceof Error
                      ? caught.message
                      : translate(
                          'components.bitrix24TaskList.startFailed',
                          'Could not start a workspace from this task.'
                        )
                  )
                }
              }}
            />
          ))}
        </div>
        {hasMore ? (
          <div className="flex justify-center border-t border-border/50 px-3 py-3">
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
