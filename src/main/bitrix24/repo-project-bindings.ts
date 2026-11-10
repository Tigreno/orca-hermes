import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  normalizeBitrix24ProjectReference,
  type Bitrix24ProjectReference
} from '../../shared/bitrix24/project-reference'
import { getRepoHostIdentityForParts } from '../../shared/repo-host-identity'

type StoredBinding = {
  repoId: string
  hostId: string
  project: Bitrix24ProjectReference
}

type Bitrix24RepoProjectBindingFile = {
  version: 1
  bindings: StoredBinding[]
}

// Bitrix24 credentials are desktop-local, so repo bindings live beside them rather than on the repo's host.
function getBindingsFilePath(): string {
  return join(homedir(), '.orca', 'bitrix24-repo-projects.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBindingFile(): Bitrix24RepoProjectBindingFile {
  const path = getBindingsFilePath()
  if (!existsSync(path)) {
    return { version: 1, bindings: [] }
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
    if (!isRecord(parsed)) {
      return { version: 1, bindings: [] }
    }
    const { version, bindings } = parsed
    if (version !== 1 || !Array.isArray(bindings)) {
      return { version: 1, bindings: [] }
    }
    const valid: StoredBinding[] = []
    for (const entry of bindings) {
      if (!isRecord(entry)) {
        continue
      }
      const { repoId, hostId, project } = entry
      const normalizedRepoId = typeof repoId === 'string' ? repoId.trim() : ''
      const normalizedHostId = typeof hostId === 'string' ? hostId.trim() : ''
      const reference = normalizeBitrix24ProjectReference(project)
      if (normalizedRepoId && normalizedHostId && reference) {
        valid.push({ repoId: normalizedRepoId, hostId: normalizedHostId, project: reference })
      }
    }
    return { version: 1, bindings: valid }
  } catch {
    return { version: 1, bindings: [] }
  }
}

function writeBindingFile(bindings: readonly StoredBinding[]): void {
  const dir = join(homedir(), '.orca')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const file: Bitrix24RepoProjectBindingFile = { version: 1, bindings: [...bindings] }
  writeFileSync(getBindingsFilePath(), JSON.stringify(file, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function readRepoProjectBindings(): Record<string, Bitrix24ProjectReference> {
  return Object.fromEntries(
    readBindingFile().bindings.map((binding) => [
      getRepoHostIdentityForParts(binding.repoId, binding.hostId),
      binding.project
    ])
  )
}

export function setRepoProjectBinding(args: {
  repoId: string
  hostId: string
  project: unknown
}): Bitrix24ProjectReference | null {
  const repoId = args.repoId.trim()
  const hostId = args.hostId.trim()
  if (!repoId || !hostId) {
    throw new Error('A repo and its host are required to save a Bitrix24 project.')
  }
  const reference = normalizeBitrix24ProjectReference(args.project)
  if (reference === undefined) {
    throw new Error('Invalid Bitrix24 project reference.')
  }
  const key = getRepoHostIdentityForParts(repoId, hostId)
  const others = readBindingFile().bindings.filter(
    (binding) => getRepoHostIdentityForParts(binding.repoId, binding.hostId) !== key
  )
  writeBindingFile(reference ? [...others, { repoId, hostId, project: reference }] : others)
  return reference
}
