import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import type {
  Bitrix24Project,
  Bitrix24TaskDetail
} from '../../../../../shared/bitrix24/bitrix24-types'
import type { Bitrix24ProjectReference } from '../../../../../shared/bitrix24/project-reference'
import type { Bitrix24TaskUpdateFields } from '../../../../../shared/bitrix24/connection-types'
import { Bitrix24ProjectPicker } from '@/components/bitrix24-project-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslate } from '@/i18n/use-translate'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function deadlineToInputValue(deadline: string | null): string {
  if (!deadline) {
    return ''
  }
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function inputValueToDeadline(value: string): string | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function Bitrix24TaskPropertiesEditor({
  task,
  projects,
  portalHost,
  projectsLoading,
  saving,
  onSave
}: {
  task: Bitrix24TaskDetail
  projects: readonly Bitrix24Project[]
  portalHost: string | null
  projectsLoading: boolean
  saving: boolean
  onSave: (fields: Bitrix24TaskUpdateFields) => Promise<void>
}): React.JSX.Element {
  const t = useTranslate()
  const [projectDraft, setProjectDraft] = useState<Bitrix24ProjectReference | null>(() =>
    task.group && portalHost
      ? { portalHost, groupId: task.group.id, groupName: task.group.name }
      : null
  )
  const [deadlineDraft, setDeadlineDraft] = useState(() => deadlineToInputValue(task.deadline))

  const currentProjectId = task.group?.id ?? null
  const projectChanged = portalHost !== null && (projectDraft?.groupId ?? null) !== currentProjectId
  const deadlineChanged = deadlineDraft !== deadlineToInputValue(task.deadline)
  const deadlineValid = !deadlineDraft || !Number.isNaN(new Date(deadlineDraft).getTime())
  const canSave = !saving && deadlineValid && (projectChanged || deadlineChanged)

  const save = async (): Promise<void> => {
    if (!canSave) {
      return
    }
    const fields: Bitrix24TaskUpdateFields = {}
    if (projectChanged) {
      fields.groupId = projectDraft?.groupId ?? null
    }
    if (deadlineChanged) {
      fields.deadline = inputValueToDeadline(deadlineDraft)
    }
    await onSave(fields)
  }

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('components.bitrix24TaskDetail.editTitle', 'Edit in Bitrix24')}
        </p>
        <p className="mt-1 text-2xs text-muted-foreground">
          {t('components.bitrix24TaskDetail.editHint', 'Changes are saved to Bitrix24 right away.')}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label variant="settings">{t('components.bitrix24TaskDetail.project', 'Project')}</Label>
        <Bitrix24ProjectPicker
          projects={projects}
          portalHost={portalHost}
          value={projectDraft}
          onChange={setProjectDraft}
          label={t('components.bitrix24TaskDetail.project', 'Project')}
          emptyLabel={t('components.bitrix24TaskDetail.noProject', 'No project')}
          disabled={saving || projectsLoading || !portalHost}
        />
      </div>
      <div className="space-y-1.5">
        <Label variant="settings">{t('components.bitrix24TaskDetail.deadline', 'Deadline')}</Label>
        <Input
          type="datetime-local"
          density="compact"
          value={deadlineDraft}
          onChange={(event) => setDeadlineDraft(event.target.value)}
          disabled={saving}
          aria-invalid={!deadlineValid}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void save()
            }
          }}
        />
        <p className="text-2xs text-muted-foreground">
          {t('components.bitrix24TaskDetail.deadlineHint', 'Leave empty to remove the deadline.')}
        </p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={!canSave}>
          {saving ? <LoaderCircle className="mr-1.5 size-3.5 animate-spin" /> : null}
          {saving
            ? t('components.bitrix24TaskDetail.saving', 'Saving...')
            : t('components.bitrix24TaskDetail.saveChanges', 'Save changes')}
        </Button>
      </div>
    </section>
  )
}
