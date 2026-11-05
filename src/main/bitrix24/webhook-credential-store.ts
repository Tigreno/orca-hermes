import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CredentialDecryptionError,
  readStoredCredentialToken,
  writeEncryptedCredential
} from '../credentials/integration-credential-file'
import type { Bitrix24WebhookCredential } from '../../shared/bitrix24/webhook-url'

export type Bitrix24WebhookFile = {
  version: 1
  portalHost: string
  userId: string
}

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getWebhookFilePath(): string {
  return join(getOrcaDir(), 'bitrix24-webhook.json')
}

export function getBitrix24TokenDir(): string {
  return join(getOrcaDir(), 'bitrix24-tokens')
}

function getTokenPath(portalHost: string): string {
  return join(getBitrix24TokenDir(), `${Buffer.from(portalHost).toString('base64url')}.enc`)
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function readWebhookFile(): Bitrix24WebhookFile | null {
  const path = getWebhookFilePath()
  if (!existsSync(path)) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, { encoding: 'utf-8' }))
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      !('version' in parsed) ||
      parsed.version !== 1 ||
      !('portalHost' in parsed) ||
      typeof parsed.portalHost !== 'string' ||
      !parsed.portalHost.trim() ||
      !('userId' in parsed) ||
      typeof parsed.userId !== 'string' ||
      !parsed.userId.trim()
    ) {
      return null
    }
    return { version: 1, portalHost: parsed.portalHost, userId: parsed.userId }
  } catch {
    return null
  }
}

export function readWebhookCredential(): Bitrix24WebhookCredential | null {
  const file = readWebhookFile()
  if (!file) {
    return null
  }
  const path = getTokenPath(file.portalHost)
  if (!existsSync(path)) {
    return null
  }
  try {
    const token = readStoredCredentialToken('Bitrix24', readFileSync(path))
    return token ? { portalHost: file.portalHost, userId: file.userId, token } : null
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      throw error
    }
    return null
  }
}

export function hasStoredWebhook(): boolean {
  const file = readWebhookFile()
  return file !== null && existsSync(getTokenPath(file.portalHost))
}

export function saveWebhookCredential(credential: Bitrix24WebhookCredential): void {
  ensureDir(getOrcaDir())
  ensureDir(getBitrix24TokenDir())
  writeEncryptedCredential('Bitrix24', getTokenPath(credential.portalHost), credential.token)
  const file: Bitrix24WebhookFile = {
    version: 1,
    portalHost: credential.portalHost,
    userId: credential.userId
  }
  writeFileSync(getWebhookFilePath(), JSON.stringify(file, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export function clearWebhookCredential(): void {
  const file = readWebhookFile()
  if (file) {
    try {
      unlinkSync(getTokenPath(file.portalHost))
    } catch {}
  }
  try {
    unlinkSync(getWebhookFilePath())
  } catch {}
}
