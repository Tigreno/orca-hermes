import { LoaderCircle, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import TaskProjectSourceCombobox from '@/components/task-project-source-combobox'
import { normalizeTaskRepoSelection } from '@/components/task-page/task-page-default-repo-selection'
import type { Bitrix24TaskFilter } from '../../../../../shared/bitrix24/bitrix24-types'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { TaskPageComposerActionsModel } from '../use-task-page-composer-actions'
import { useBitrix24TaskPage } from './task-page-bitrix24-context'

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

export function TaskPageBitrix24Filters({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const {
    connected,
    filter,
    setFilter,
    searchInput,
    setSearchInput,
    submitSearch,
    clearSearch,
    loading,
    refresh
  } = useBitrix24TaskPage()
  const {
    eligibleRepos,
    repoSelection,
    setRepoSelection,
    taskPickerGroups,
    taskPickerRepos,
    getTaskPickerRepoHostLabel,
    updateSettings
  } = model

  if (!connected) {
    return null
  }

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0 w-full sm:w-[220px]">
          <TaskProjectSourceCombobox
            groups={taskPickerGroups}
            selected={repoSelection}
            getRepoHostLabel={getTaskPickerRepoHostLabel}
            onChange={(next) => {
              const normalized = normalizeTaskRepoSelection(eligibleRepos, next)
              setRepoSelection(normalized)
              void updateSettings({ defaultRepoSelection: [...normalized] }).catch(() => {
                toast.error(
                  translate(
                    'auto.components.TaskPage.dfd72673e7',
                    'Failed to save project selection.'
                  )
                )
              })
            }}
            onSelectAll={() => {
              const allIds = new Set(taskPickerRepos.map((repo) => repo.id))
              setRepoSelection(allIds)
              void updateSettings({ defaultRepoSelection: null }).catch(() => {
                toast.error(
                  translate(
                    'auto.components.TaskPage.dfd72673e7',
                    'Failed to save project selection.'
                  )
                )
              })
            }}
            triggerClassName="h-8 w-full rounded-md border border-border/50 bg-muted/50 px-2 text-xs font-medium shadow-sm transition hover:bg-muted/50 focus:ring-2 focus:ring-ring/20 focus:outline-none"
          />
        </div>
      </div>
      <div className="rounded-md rounded-b-none border border-border/50 bg-muted/50 px-3 pt-2 pb-2 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((entry) => {
              const active = filter === entry
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setFilter(entry)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs transition',
                    active
                      ? 'border-border/50 bg-foreground/90 text-background backdrop-blur-md'
                      : 'border-border/50 bg-transparent text-foreground hover:bg-muted/50'
                  )}
                >
                  {filterLabel(entry)}
                </button>
              )
            })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                className="w-[190px]"
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refresh}
                  disabled={loading}
                  aria-label={translate('components.bitrix24Filters.refresh', 'Refresh tasks')}
                >
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                {translate('components.bitrix24Filters.refresh', 'Refresh tasks')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  )
}
