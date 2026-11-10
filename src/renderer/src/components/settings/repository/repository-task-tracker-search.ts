import type { Repo } from '../../../../../shared/repo-types'
import type { SearchKeywordTranslator } from '../search/settings-search-keywords'
import type { SettingsSearchEntry } from '../search/settings-search'
import type { Translate } from '@/i18n/use-translate'

export function getRepositoryTaskTrackerSearchParts(
  repo: Repo,
  t: Translate,
  translateSearchKeyword: SearchKeywordTranslator
): { jira: SettingsSearchEntry; bitrix24: SettingsSearchEntry } {
  return {
    jira: {
      title: t('components.RepositoryJiraProjectSection.title', 'Default Jira project'),
      description: t(
        'components.RepositoryJiraProjectSection.description',
        'Default the Jira issue picker and Tasks list to this project. You can change it for each worktree.'
      ),
      keywords: [
        repo.displayName,
        ...translateSearchKeyword('components.RepositoryJiraProjectSection.keywordJira', 'jira'),
        ...translateSearchKeyword(
          'components.RepositoryJiraProjectSection.keywordDefaultProject',
          'default project'
        ),
        ...translateSearchKeyword(
          'components.RepositoryJiraProjectSection.keywordIssuePicker',
          'issue picker'
        )
      ]
    },
    bitrix24: {
      title: t('components.RepositoryBitrix24ProjectSection.title', 'Default Bitrix24 project'),
      description: t(
        'components.RepositoryBitrix24ProjectSection.searchDescription',
        'Default the Tasks list to one Bitrix24 project for this repo.'
      ),
      keywords: [
        repo.displayName,
        ...translateSearchKeyword(
          'components.RepositoryBitrix24ProjectSection.keywordBitrix24',
          'bitrix24'
        ),
        ...translateSearchKeyword(
          'components.RepositoryBitrix24ProjectSection.keywordDefaultProject',
          'default project'
        ),
        ...translateSearchKeyword(
          'components.RepositoryBitrix24ProjectSection.keywordWorkgroup',
          'workgroup'
        )
      ]
    }
  }
}
