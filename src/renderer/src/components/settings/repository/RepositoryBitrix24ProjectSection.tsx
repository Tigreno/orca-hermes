import { useState } from 'react'
import type { Repo } from '../../../../../shared/repo-types'
import type { Bitrix24ProjectReference } from '../../../../../shared/bitrix24/project-reference'
import { useAppStore } from '@/store/index'
import { useBitrix24ProjectInventory } from '../../use-bitrix24-project-inventory'
import { Bitrix24ProjectPicker } from '../../bitrix24-project-picker'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { translate } from '@/i18n/i18n'

export function RepositoryBitrix24ProjectSection({
  repo,
  updateRepo,
  forceVisible
}: {
  repo: Repo
  updateRepo: (
    id: string,
    updates: {
      defaultBitrix24Project: Bitrix24ProjectReference | null
    }
  ) => unknown
  forceVisible?: boolean
}): React.JSX.Element {
  const inventory = useBitrix24ProjectInventory(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const applyProject = async (project: Bitrix24ProjectReference | null) => {
    setSaving(true)
    setError(null)
    try {
      const result = await updateRepo(repo.id, { defaultBitrix24Project: project })
      if (result === false) {
        throw new Error(
          translate(
            'components.RepositoryBitrix24ProjectSection.saveFailed',
            'Could not save the default Bitrix24 project.'
          )
        )
      }
      const echoed = useAppStore
        .getState()
        .repos.find((entry) => entry.id === repo.id)?.defaultBitrix24Project
      if (
        (echoed?.portalHost ?? null) !== (project?.portalHost ?? null) ||
        (echoed?.groupId ?? null) !== (project?.groupId ?? null)
      ) {
        throw new Error(
          translate(
            'components.RepositoryBitrix24ProjectSection.runtimeUpdate',
            'Update this runtime to save a default Bitrix24 project.'
          )
        )
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }
  const label = translate(
    'components.RepositoryBitrix24ProjectSection.title',
    'Default Bitrix24 project'
  )
  const value = repo.defaultBitrix24Project ?? null
  const portalMismatch =
    value !== null && inventory.portalHost !== null && value.portalHost !== inventory.portalHost
  const projectMissing =
    value !== null &&
    !portalMismatch &&
    !inventory.loading &&
    !inventory.error &&
    inventory.projects.length > 0 &&
    !inventory.projects.some((project) => project.id === value.groupId)
  return (
    <SearchableSetting
      title={label}
      description={translate(
        'components.RepositoryBitrix24ProjectSection.description',
        'Show only this Bitrix24 project’s tasks on the repo Tasks page.'
      )}
      keywords={['bitrix24', 'project', 'tasks', repo.displayName]}
      forceVisible={forceVisible}
      className="space-y-2"
    >
      <p className="text-sm font-semibold">{label}</p>
      <Bitrix24ProjectPicker
        projects={inventory.projects}
        portalHost={inventory.portalHost}
        value={value}
        onChange={(project) => void applyProject(project)}
        label={label}
        emptyLabel={translate(
          'components.RepositoryBitrix24ProjectSection.none',
          'No default project'
        )}
        disabled={inventory.loading || saving}
      />
      {!inventory.connected && !inventory.loading ? (
        <p className="text-xs text-muted-foreground">
          {translate(
            'components.RepositoryBitrix24ProjectSection.connect',
            'Connect Bitrix24 in Integrations to choose a project.'
          )}
        </p>
      ) : null}
      {portalMismatch ? (
        <p role="alert" className="text-xs text-destructive">
          {translate(
            'components.RepositoryBitrix24ProjectSection.portalChanged',
            'This project belongs to another Bitrix24 portal. Select it again after connecting the current portal.'
          )}
        </p>
      ) : projectMissing ? (
        <p className="text-xs text-status-warning-text">
          {translate(
            'components.RepositoryBitrix24ProjectSection.projectMissing',
            'This project is not in the visible list. Tasks still load for its project ID.'
          )}
        </p>
      ) : null}
      {error || inventory.error ? (
        <p role="alert" className="text-xs text-destructive">
          {error ?? inventory.error}
        </p>
      ) : null}
    </SearchableSetting>
  )
}
