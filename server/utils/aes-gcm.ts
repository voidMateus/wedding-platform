import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Núcleo puro de cifra simétrica em repouso — AES-256-GCM
 * (confidencialidade + integridade autenticada), sem nenhum auto-import do
 * Nitro/Nuxt, só pra poder ser testado direto fora do runtime do servidor
 * (tests/unit/server/aes-gcm.spec.ts), mesmo motivo de rsvp-token.ts ser
 * puro. server/utils/token-cipher.ts envolve isto resolvendo a chave a
 * partir do ambiente (useRuntimeConfig).
 *
 * A chave nunca vem do banco e é sempre separada por finalidade — ver
 * token-cipher.ts.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/** Aceita hex (64 chars) ou base64 — os dois representam 32 bytes. */
export function parseEncryptionKey(raw: string | undefined, envName: string): Buffer {
  if (!raw) {
    throw new Error(`${envName} não configurada.`)
  }
  const key = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`${envName} deve ter 32 bytes (hex de 64 chars ou base64).`)
  }
  return key
}

/** Retorna `iv:tag:ciphertext`, cada parte em base64. */
export function encryptWithKey(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decryptWithKey(payload: string, key: Buffer): string {
  const [ivB64, tagB64, dataB64] = payload.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Payload cifrado inválido.')
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
