import type { Repo } from '../../../../shared/repo-types'
import type { Bitrix24ProjectReference } from '../../../../shared/bitrix24/project-reference'
import {
  bitrix24RepoProjectBindings,
  bitrix24SetRepoProjectBinding
} from '../../runtime/runtime-bitrix24-client'
import { getRepoHostIdentity } from '../../../../shared/repo-host-identity'

/** Bindings live on the desktop, so a failed read must not hide the rest of the catalog. */
export async function readBitrix24RepoProjectBindings(): Promise<
  Record<string, Bitrix24ProjectReference>
> {
  try {
    return await bitrix24RepoProjectBindings()
  } catch {
    return {}
  }
}

/** Removing a repo drops its desktop binding; a failure there must not block the removal. */
export async function clearBitrix24RepoProjectBinding(
  repoId: string,
  hostId: string
): Promise<void> {
  try {
    await bitrix24SetRepoProjectBinding({ repoId, hostId, project: null })
  } catch (error) {
    console.warn('[repos] failed to drop desktop Bitrix24 project binding', error)
  }
}

/**
 * This desktop is the sole writer of runtime-host bindings, so its saved value wins over a host echo.
 * Absent keys leave the row's own value untouched for hosts that still persist one themselves.
 */
export function applyBitrix24RepoProjectBindings(
  repos: readonly Repo[],
  bindings: Record<string, Bitrix24ProjectReference>
): readonly Repo[] {
  if (Object.keys(bindings).length === 0) {
    return repos
  }
  let changed = false
  const next = repos.map((repo) => {
    const binding = bindings[getRepoHostIdentity(repo)]
    if (!binding) {
      return repo
    }
    changed = true
    return { ...repo, defaultBitrix24Project: binding }
  })
  return changed ? next : repos
}
