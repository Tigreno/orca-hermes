import type { Repo } from '../../../../../../shared/repository/repo-types'
import type { Translate } from '@/i18n/use-translate'
import { Label } from '../../../ui/label'
import { SearchableSetting } from '../../section-layout/SearchableSetting'
import { RepoSettingsDraftInput } from '../RepositorySettingsDraftInput'
import { getRepositoryIconSectionId } from '../repository-settings-targets'
import type { RepositoryPaneRepoUpdate } from '../repository-pane-repo-update'
import { RepositoryIconPicker } from './RepositoryIconPicker'

type RepositoryIdentityFieldsProps = {
  repo: Repo
  t: Translate
  forceVisible: boolean
  updateSelectedRepo: (repoId: string, updates: RepositoryPaneRepoUpdate) => void | Promise<boolean>
}

export function RepositoryIdentityFields({
  repo,
  t,
  forceVisible,
  updateSelectedRepo
}: RepositoryIdentityFieldsProps): React.JSX.Element {
  return (
    <>
      <SearchableSetting
        title={t('auto.components.settings.RepositoryPane.07deadaa00', 'Display name')}
        description={t(
          'auto.components.settings.RepositoryPane.b0a0c14a1c',
          'Project-specific display details for the sidebar and tabs.'
        )}
        keywords={[repo.displayName, repo.path, 'project name', 'repository name']}
        className="space-y-2 py-3"
        forceVisible={forceVisible}
      >
        <Label htmlFor={`repo-display-name-${repo.id}`} className="text-sm font-semibold">
          {t('auto.components.settings.RepositoryPane.07deadaa00', 'Display name')}
        </Label>
        <RepoSettingsDraftInput
          id={`repo-display-name-${repo.id}`}
          repoId={repo.id}
          storeValue={repo.displayName}
          onTextChange={(text) => updateSelectedRepo(repo.id, { displayName: text })}
          className="h-9 text-sm"
        />
      </SearchableSetting>

      <SearchableSetting
        title={t('auto.components.settings.RepositoryPane.e856e61455', 'Project icon')}
        description={t(
          'auto.components.settings.RepositoryPane.e641c359de',
          'Project icon and color used in the sidebar and tabs.'
        )}
        keywords={[
          repo.displayName,
          repo.path,
          'project icon',
          'repository icon',
          'color',
          'badge',
          'emoji',
          'favicon'
        ]}
        className="space-y-2 py-3"
        id={getRepositoryIconSectionId(repo.id)}
        forceVisible={forceVisible}
      >
        <RepositoryIconPicker repo={repo} updateRepo={updateSelectedRepo} />
      </SearchableSetting>
    </>
  )
}
