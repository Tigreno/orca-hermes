// Stub: external automation target matching was extracted from the upstream
// custom-agent branch but the matching helper did not land in this build.
// Return false so the editor action falls back to its non-external path until
// the real matcher is implemented.
import type { Repo } from '../../../../shared/repo-types'

export function repoMatchesExternalAutomationTarget(_repo: Repo, _target: unknown): boolean {
  return false
}
