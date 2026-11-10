import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
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

async function readWebhookFile(): Promise<Bitrix24WebhookFile | null> {
  let raw: string
  try {
    raw = await readFile(getWebhookFilePath(), 'utf-8')
  } catch {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
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

async function readTokenFile(portalHost: string): Promise<Buffer | null> {
  try {
    return await readFile(getTokenPath(portalHost))
  } catch {
    return null
  }
}

export async function readWebhookCredential(): Promise<Bitrix24WebhookCredential | null> {
  const file = await readWebhookFile()
  if (!file) {
    return null
  }
  const raw = await readTokenFile(file.portalHost)
  if (!raw) {
    return null
  }
  try {
    const token = readStoredCredentialToken('Bitrix24', raw)
    return token ? { portalHost: file.portalHost, userId: file.userId, token } : null
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      throw error
    }
    return null
  }
}

export async function hasStoredWebhook(): Promise<boolean> {
  const file = await readWebhookFile()
  return file !== null && (await readTokenFile(file.portalHost)) !== null
}

export async function saveWebhookCredential(credential: Bitrix24WebhookCredential): Promise<void> {
  await mkdir(getOrcaDir(), { recursive: true })
  await mkdir(getBitrix24TokenDir(), { recursive: true })
  writeEncryptedCredential('Bitrix24', getTokenPath(credential.portalHost), credential.token)
  const file: Bitrix24WebhookFile = {
    version: 1,
    portalHost: credential.portalHost,
    userId: credential.userId
  }
  await writeFile(getWebhookFilePath(), JSON.stringify(file, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

export async function clearWebhookCredential(): Promise<void> {
  const file = await readWebhookFile()
  if (file) {
    try {
      await unlink(getTokenPath(file.portalHost))
    } catch {}
  }
  try {
    await unlink(getWebhookFilePath())
  } catch {}
}
