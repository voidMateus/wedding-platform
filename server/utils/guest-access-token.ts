import { createHash, randomBytes } from 'node:crypto'

// Código de acesso do convidado (CLAUDE.md, seção 14.5): entropia suficiente
// para não ser adivinhável por força bruta, nunca persistido em texto plano —
// só o hash (code_hash) é gravado em guest_access_tokens.

const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const ACCESS_CODE_LENGTH = 24

export function generateAccessCode(): string {
  const bytes = randomBytes(ACCESS_CODE_LENGTH)
  let code = ''
  for (const byte of bytes) {
    code += BASE62_ALPHABET[byte % BASE62_ALPHABET.length]
  }
  return code
}

export function hashAccessCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}
