import type { Repo } from '../../../../../shared/repository/repo-types'
import { isFolderRepo } from '../../../../../shared/repository/repo-kind'
import type { SettingsSearchEntry } from '../search/settings-search'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import { getRepositoryFormatterSearchEntry } from './RepositoryFormatterSection'
import {
  getRepositoryGitWorktreeSearchEntries,
  getRepositoryGitWorktreeSearchMetadata
} from './worktrees/repository-git-worktree-search-entries'
import { getRepositoryWorkspaceCleanupSearchEntry } from './workspace-cleanup/repository-workspace-cleanup-search'
import {
  getRepositorySearchParts,
  type RepositoryPaneSearchOptions
} from './repository-search-parts'

export function getRepositoryPaneSearchEntries(
  repo: Repo,
  options: RepositoryPaneSearchOptions = {},
  t: Translate = translate
): SettingsSearchEntry[] {
  const parts = getRepositorySearchParts(repo, options, t)
  const entries = [
    getRepositoryFormatterSearchEntry(t),
    parts.agentTrust,
    parts.browserProfile,
    parts.jira,
    parts.bitrix24,
    parts.displayName,
    parts.icon
  ]
  if (parts.github) {
    entries.push(parts.github)
  }
  if (parts.fork) {
    entries.push(parts.fork)
  }
  if (parts.projectRuntime) {
    entries.push(parts.projectRuntime)
  }
  if (!isFolderRepo(repo)) {
    entries.push(...getRepositoryGitWorktreeSearchEntries(repo, t))
    entries.push(getRepositoryWorkspaceCleanupSearchEntry(repo, t))
  }
  entries.push(parts.sidebarVisibility, parts.removeProject)
  if (parts.sourceControlAi) {
    entries.push(...parts.sourceControlAi)
  }
  if (parts.mcp) {
    entries.push(...parts.mcp)
  }
  if (parts.hooks) {
    entries.push(...parts.hooks)
  }
  return entries
}

export function getRepositoryPaneSearchMetadata(
  repo: Repo,
  options: RepositoryPaneSearchOptions = {},
  t: Translate = translate
) {
  const parts = getRepositorySearchParts(repo, options, t)
  const worktrees = isFolderRepo(repo) ? undefined : getRepositoryGitWorktreeSearchMetadata(repo, t)
  const identity = [
    parts.agentTrust,
    parts.browserProfile,
    parts.jira,
    parts.bitrix24,
    parts.displayName,
    parts.icon
  ]
  if (parts.github) {
    identity.push(parts.github)
  }
  if (parts.fork) {
    identity.push(parts.fork)
  }
  if (parts.projectRuntime) {
    identity.push(parts.projectRuntime)
  }
  if (worktrees) {
    identity.push(...worktrees.identity)
  }
  return {
    identity,
    removeProject: parts.removeProject,
    sidebarVisibility: parts.sidebarVisibility,
    projectRuntime: parts.projectRuntime ? [parts.projectRuntime] : [],
    sparsePresets: worktrees?.sparsePresets ?? [],
    sharedPaths: worktrees?.sharedPaths ?? [],
    sourceControlAi: parts.sourceControlAi ?? [],
    mcp: parts.mcp ?? [],
    hooks: parts.hooks ?? [],
    // Host setups has no indexed descriptor; keep its existing empty-query admission.
    hostSetups: [] satisfies SettingsSearchEntry[]
  }
}
