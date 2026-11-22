import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import type { Bitrix24TaskDetail } from '../../../../../shared/bitrix24/bitrix24-types'
import type { Bitrix24TaskUpdateFields } from '../../../../../shared/bitrix24/connection-types'
import { useBitrix24ProjectInventory } from '@/components/use-bitrix24-project-inventory'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { formatRelativeTime } from '../task-page-source-context'
import { useBitrix24TaskPage } from './task-page-bitrix24-context'
import { getBitrix24StatusLabel, getBitrix24StatusTone } from './task-page-bitrix24-status'
import { Bitrix24TaskPropertiesEditor } from './TaskPropertiesEditor'
import {
  focusBitrix24TaskTerminal,
  sendBitrix24TaskToActiveTerminal
} from './send-bitrix24-task-to-terminal'

async function saveBitrix24Task(
  fields: Bitrix24TaskUpdateFields,
  updateTask: (fields: Bitrix24TaskUpdateFields) => Promise<Bitrix24TaskDetail>,
  t: Translate,
  setSavingTask: (saving: boolean) => void
): Promise<void> {
  try {
    await updateTask(fields)
    toast.success(t('components.bitrix24TaskDetail.saved', 'Task updated in Bitrix24.'))
  } catch (caught) {
    toast.error(
      caught instanceof Error
        ? caught.message
        : t('components.bitrix24TaskDetail.saveFailed', 'Could not update the task in Bitrix24.')
    )
  } finally {
    setSavingTask(false)
  }
}

async function sendBitrix24Task(
  task: Bitrix24TaskDetail,
  focusTerminalOnCloseRef: React.RefObject<boolean>,
  closeTask: () => void,
  t: Translate,
  setSendingToTerminal: (sending: boolean) => void
): Promise<void> {
  try {
    const result = await sendBitrix24TaskToActiveTerminal(task)
    if (result === 'sent') {
      focusTerminalOnCloseRef.current = true
      closeTask()
      toast.success(t('components.bitrix24TaskDetail.sentToTerminal', 'Task sent to terminal.'))
    } else if (result === 'no-terminal') {
      toast.error(
        t('components.bitrix24TaskDetail.noTerminal', 'Open a terminal in this workspace first.')
      )
    } else {
      toast.error(
        t('components.bitrix24TaskDetail.sendFailed', 'Could not send the task to the terminal.')
      )
    }
  } finally {
    setSendingToTerminal(false)
  }
}

export function Bitrix24TaskDetail(): React.JSX.Element {
  const t = useTranslate()
  const {
    selectedTaskId,
    selectedTask,
    detailLoading,
    detailError,
    closeTask,
    startWorkspace,
    updateTask
  } = useBitrix24TaskPage()
  const projectInventory = useBitrix24ProjectInventory(selectedTask !== null)
  const [sendingToTerminal, setSendingToTerminal] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const focusTerminalOnCloseRef = useRef(false)

  useEffect(() => {
    if (selectedTaskId !== null) {
      focusTerminalOnCloseRef.current = false
    }
  }, [selectedTaskId])

  const saveTaskFields = async (fields: Bitrix24TaskUpdateFields): Promise<void> => {
    if (savingTask) {
      return
    }
    setSavingTask(true)
    await saveBitrix24Task(fields, updateTask, t, setSavingTask)
  }

  const sendToTerminal = async (): Promise<void> => {
    if (!selectedTask || sendingToTerminal) {
      return
    }
    setSendingToTerminal(true)
    await sendBitrix24Task(
      selectedTask,
      focusTerminalOnCloseRef,
      closeTask,
      t,
      setSendingToTerminal
    )
  }

  return (
    <Sheet open={selectedTaskId !== null} onOpenChange={(open) => !open && closeTask()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px]"
        onCloseAutoFocus={(event) => {
          const shouldFocusTerminal = focusTerminalOnCloseRef.current
          focusTerminalOnCloseRef.current = false
          if (!shouldFocusTerminal) {
            return
          }
          event.preventDefault()
          focusBitrix24TaskTerminal()
        }}
      >
        <SheetHeader>
          <SheetTitle>
            {selectedTask?.title ?? t('components.bitrix24TaskDetail.title', 'Bitrix24 task')}
          </SheetTitle>
          <SheetDescription>
            {t(
              'components.bitrix24TaskDetail.description',
              'Read task details, edit the project or deadline, and start a workspace.'
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek px-5 py-4">
          {detailLoading && !selectedTask ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {t('components.bitrix24TaskDetail.loading', 'Loading task...')}
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
                  {t('components.bitrix24TaskDetail.id', 'Task #{{id}}', {
                    id: selectedTask.id
                  })}
                </span>
                {selectedTask.group ? <span>{selectedTask.group.name}</span> : null}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('components.bitrix24TaskDetail.responsible', 'Responsible')}
                  </dt>
                  <dd>{selectedTask.responsible?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('components.bitrix24TaskDetail.creator', 'Creator')}
                  </dt>
                  <dd>{selectedTask.creator?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('components.bitrix24TaskDetail.deadline', 'Deadline')}
                  </dt>
                  <dd>{selectedTask.deadline ? formatRelativeTime(selectedTask.deadline) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t('components.bitrix24TaskDetail.updated', 'Updated')}
                  </dt>
                  <dd>
                    {selectedTask.changedDate ? formatRelativeTime(selectedTask.changedDate) : '—'}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('components.bitrix24TaskDetail.descriptionTitle', 'Description')}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {selectedTask.descriptionText ||
                    t('components.bitrix24TaskDetail.noDescription', 'No description.')}
                </p>
              </div>

              <Bitrix24TaskPropertiesEditor
                key={`${selectedTask.id}:${selectedTask.group?.id ?? ''}:${selectedTask.deadline ?? ''}:${projectInventory.portalHost ?? ''}`}
                task={selectedTask}
                projects={projectInventory.projects}
                portalHost={projectInventory.portalHost}
                projectsLoading={projectInventory.loading}
                saving={savingTask}
                onSave={saveTaskFields}
              />

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => startWorkspace(selectedTask)}>
                  {t('components.bitrix24TaskDetail.startWorkspace', 'Start workspace')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void sendToTerminal()}
                  disabled={sendingToTerminal}
                >
                  {sendingToTerminal ? (
                    <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Terminal className="mr-1.5 size-3.5" />
                  )}
                  {t('components.bitrix24TaskDetail.sendToTerminal', 'Send to terminal')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => openAppHttpLink(selectedTask.url, { event })}
                >
                  <ExternalLink className="mr-1.5 size-3.5" />
                  {t('components.bitrix24TaskDetail.openInBitrix24', 'Open in Bitrix24')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
