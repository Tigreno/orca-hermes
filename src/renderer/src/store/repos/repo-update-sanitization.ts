import type { RepoUpdate } from './repo-state'
import { sanitizeRepoIcon } from '../../../../shared/repository/appearance/repo-icon'
import { normalizeRepoBadgeColor } from '../../../../shared/repository/appearance/repo-badge-color'
import { normalizeGhAccountBinding } from '../../../../shared/github/accounts/account-binding'
import { normalizeJiraProjectReference } from '../../../../shared/jira/jira-project-reference'
import { normalizeBitrix24ProjectReference } from '../../../../shared/bitrix24/project-reference'
import { sanitizeAgentWorkspaceTrustDecision } from '../../../../shared/agent-launch/permissions/agent-workspace-trust-decision'
import {
  normalizeCustomWorktreeVisibilitySources,
  normalizeWorktreeVisibilitySourcePreferences
} from '../../../../shared/worktree/visibility/visibility-sources'

export function sanitizeRepoUpdate(updates: RepoUpdate): RepoUpdate {
  const sanitized = { ...updates }
  if ('defaultJiraProject' in sanitized) {
    const reference = normalizeJiraProjectReference(sanitized.defaultJiraProject)
    if (reference === undefined) {
      delete sanitized.defaultJiraProject
    } else {
      sanitized.defaultJiraProject = reference
    }
  }
  if ('defaultBitrix24Project' in sanitized) {
    const reference = normalizeBitrix24ProjectReference(sanitized.defaultBitrix24Project)
    if (reference === undefined) {
      delete sanitized.defaultBitrix24Project
    } else {
      sanitized.defaultBitrix24Project = reference
    }
  }
  if ('badgeColor' in sanitized) {
    const badgeColor = normalizeRepoBadgeColor(sanitized.badgeColor)
    if (!badgeColor) {
      delete sanitized.badgeColor
    } else {
      sanitized.badgeColor = badgeColor
    }
  }
  if ('repoIcon' in sanitized) {
    const repoIcon = sanitizeRepoIcon(sanitized.repoIcon)
    if (repoIcon === undefined) {
      delete sanitized.repoIcon
    } else {
      sanitized.repoIcon = repoIcon
    }
  }
  if ('worktreeBasePath' in sanitized && sanitized.worktreeBasePath !== undefined) {
    sanitized.worktreeBasePath = sanitized.worktreeBasePath.trim() || undefined
  }
  if (
    'forkSyncMode' in sanitized &&
    sanitized.forkSyncMode !== undefined &&
    sanitized.forkSyncMode !== 'ask' &&
    sanitized.forkSyncMode !== 'safe-auto' &&
    sanitized.forkSyncMode !== 'off'
  ) {
    delete sanitized.forkSyncMode
  }
  if (
    'agentWorkspaceTrust' in sanitized &&
    sanitizeAgentWorkspaceTrustDecision(sanitized.agentWorkspaceTrust) === undefined
  ) {
    delete sanitized.agentWorkspaceTrust
  }
  if ('ghAccount' in sanitized && sanitized.ghAccount != null) {
    const normalized = normalizeGhAccountBinding(sanitized.ghAccount)
    if (!normalized) {
      delete sanitized.ghAccount
    } else {
      sanitized.ghAccount = normalized
    }
  }
  if ('customWorktreeVisibilitySources' in sanitized) {
    const sources = normalizeCustomWorktreeVisibilitySources(
      sanitized.customWorktreeVisibilitySources
    )
    if (!sources) {
      delete sanitized.customWorktreeVisibilitySources
    } else {
      sanitized.customWorktreeVisibilitySources = sources
    }
  }
  if ('worktreeVisibilitySourcePreferences' in sanitized) {
    const preferences = normalizeWorktreeVisibilitySourcePreferences(
      sanitized.worktreeVisibilitySourcePreferences
    )
    if (!preferences) {
      delete sanitized.worktreeVisibilitySourcePreferences
    } else {
      sanitized.worktreeVisibilitySourcePreferences = preferences
    }
  }
  return sanitized
}
