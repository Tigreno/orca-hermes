import { ExternalLink, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { openAppHttpLink } from '@/lib/app-http-link-open'
import { translate } from '@/i18n/i18n'
import { formatRelativeTime } from '../task-page-source-context'
import { useBitrix24TaskPage } from './task-page-bitrix24-context'
import { getBitrix24StatusLabel, getBitrix24StatusTone } from './task-page-bitrix24-status'

export function Bitrix24TaskDetail(): React.JSX.Element {
  const { selectedTaskId, selectedTask, detailLoading, detailError, closeTask, startWorkspace } =
    useBitrix24TaskPage()
  return (
    <Sheet open={selectedTaskId !== null} onOpenChange={(open) => !open && closeTask()}>
      <SheetContent side="right" className="w-full sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>
            {selectedTask?.title ??
              translate('components.bitrix24TaskDetail.title', 'Bitrix24 task')}
          </SheetTitle>
          <SheetDescription>
            {translate(
              'components.bitrix24TaskDetail.description',
              'Read task details and start a workspace.'
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek px-5 py-4">
          {detailLoading && !selectedTask ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {translate('components.bitrix24TaskDetail.loading', 'Loading task...')}
            </div>
          ) : null}
          {detailError ? (
            <p role="alert" className="text-sm text-destructive">
              {detailError}
            </p>
          ) : null}
          {selectedTask ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`rounded-full border px-2.5 py-1 font-medium ${getBitrix24StatusTone(
                    selectedTask.status
                  )}`}
                >
                  {getBitrix24StatusLabel(selectedTask.status)}
                </span>
                <span>
                  {translate('components.bitrix24TaskDetail.id', 'Task #{{id}}', {
                    id: selectedTask.id
                  })}
                </span>
                {selectedTask.group ? <span>{selectedTask.group.name}</span> : null}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {translate('components.bitrix24TaskDetail.responsible', 'Responsible')}
                  </dt>
                  <dd>{selectedTask.responsible?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {translate('components.bitrix24TaskDetail.creator', 'Creator')}
                  </dt>
                  <dd>{selectedTask.creator?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {translate('components.bitrix24TaskDetail.deadline', 'Deadline')}
                  </dt>
                  <dd>{selectedTask.deadline ? formatRelativeTime(selectedTask.deadline) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {translate('components.bitrix24TaskDetail.updated', 'Updated')}
                  </dt>
                  <dd>
                    {selectedTask.changedDate ? formatRelativeTime(selectedTask.changedDate) : '—'}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {translate('components.bitrix24TaskDetail.descriptionTitle', 'Description')}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {selectedTask.descriptionText ||
                    translate('components.bitrix24TaskDetail.noDescription', 'No description.')}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => startWorkspace(selectedTask)}>
                  {translate('components.bitrix24TaskDetail.startWorkspace', 'Start workspace')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => openAppHttpLink(selectedTask.url, { event })}
                >
                  <ExternalLink className="mr-1.5 size-3.5" />
                  {translate('components.bitrix24TaskDetail.openInBitrix24', 'Open in Bitrix24')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
