import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Cifra reversível dos tokens OAuth do Google Drive em repouso (Fase Galeria
 * via Google Drive — CLAUDE.md). AES-256-GCM (confidencialidade + integridade
 * autenticada). A chave vem só do ambiente do servidor
 * (DRIVE_TOKEN_ENCRYPTION_KEY), nunca do banco.
 *
 * Por que cifra e não hash como `codigo_hash` (guest-access-token.ts, SHA-256):
 * o código do convidado só precisa ser COMPARADO, então um hash de mão única
 * basta; um refresh token do Google precisa ser USADO (descifrado) para
 * renovar o acesso — logo exige cifra reversível. A propriedade de segurança
 * mantida é a mesma: nunca em texto plano em repouso (CLAUDE.md, seções 11/28).
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(): Buffer {
  const raw = useRuntimeConfig().driveTokenEncryptionKey
  if (!raw) {
    throw new Error('DRIVE_TOKEN_ENCRYPTION_KEY não configurada.')
  }
  // Aceita hex (64 chars) ou base64 — os dois representam 32 bytes.
  const key = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('DRIVE_TOKEN_ENCRYPTION_KEY deve ter 32 bytes (hex de 64 chars ou base64).')
  }
  return key
}

/** Retorna `iv:tag:ciphertext`, cada parte em base64. */
export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Payload cifrado inválido.')
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString(
    'utf8',
  )
}
