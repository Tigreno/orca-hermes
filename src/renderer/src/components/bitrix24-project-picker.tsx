import { useState } from 'react'
import type { Bitrix24Project } from '../../../shared/bitrix24/bitrix24-types'
import type { Bitrix24ProjectReference } from '../../../shared/bitrix24/project-reference'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { WorkItemScopePicker, type WorkItemScopeOption } from './work-item-scope-picker'
import { translate } from '@/i18n/i18n'

export function Bitrix24ProjectPicker({
  projects,
  portalHost,
  value,
  onChange,
  label,
  emptyLabel,
  disabled
}: {
  projects: readonly Bitrix24Project[]
  portalHost: string | null
  value: Bitrix24ProjectReference | null
  onChange: (project: Bitrix24ProjectReference | null) => void
  label: string
  emptyLabel: string
  disabled?: boolean
}): React.JSX.Element {
  const [manualOpen, setManualOpen] = useState(false)
  const [manualId, setManualId] = useState('')

  const options: WorkItemScopeOption<Bitrix24ProjectReference>[] = portalHost
    ? projects.map((project) => ({
        key: project.id,
        value: { portalHost, groupId: project.id, groupName: project.name },
        label: `${project.name} (${project.id})`,
        searchText: `${project.name} ${project.id}`
      }))
    : []

  const applyManualId = (): void => {
    const groupId = manualId.trim()
    if (!groupId || !portalHost) {
      return
    }
    onChange({
      portalHost,
      groupId,
      groupName: translate('components.bitrix24ProjectPicker.manualName', 'Project {{id}}', {
        id: groupId
      })
    })
    setManualId('')
    setManualOpen(false)
  }

  return (
    <div className="space-y-2">
      <WorkItemScopePicker
        options={options}
        selectedKey={value?.groupId ?? null}
        selectedLabel={value ? `${value.groupName} (${value.groupId})` : undefined}
        onChange={onChange}
        label={label}
        allLabel={emptyLabel}
        searchPlaceholder={translate(
          'components.bitrix24ProjectPicker.search',
          'Search Bitrix24 projects'
        )}
        emptyLabel={translate(
          'components.bitrix24ProjectPicker.empty',
          'No projects found. Enter an ID manually.'
        )}
        disabled={disabled}
      />
      {manualOpen ? (
        <div className="flex items-center gap-2">
          <Input
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
            placeholder={translate(
              'components.bitrix24ProjectPicker.manualPlaceholder',
              'Bitrix24 project ID'
            )}
            aria-label={translate(
              'components.bitrix24ProjectPicker.manualPlaceholder',
              'Bitrix24 project ID'
            )}
            disabled={disabled}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyManualId()
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={applyManualId}
            disabled={disabled || !manualId.trim()}
          >
            {translate('components.bitrix24ProjectPicker.apply', 'Use ID')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          size="inline"
          onClick={() => setManualOpen(true)}
          disabled={disabled || !portalHost}
        >
          {translate('components.bitrix24ProjectPicker.manual', 'Enter project ID manually')}
        </Button>
      )}
    </div>
  )
}
