import { decryptWithKey, encryptWithKey, parseEncryptionKey } from './aes-gcm'

/**
 * Resolve a chave de cifra a partir do ambiente do servidor e envolve o
 * núcleo puro de AES-256-GCM (aes-gcm.ts). A chave nunca vem do banco, e é
 * separada por finalidade: rotacionar ou comprometer uma não afeta a outra.
 *
 * Por que cifra e não hash como `codigo_hash` (guest-access-token.ts,
 * SHA-256): hash de mão única basta quando o segredo só precisa ser
 * COMPARADO. Os dois usos aqui precisam do valor original de volta —
 *
 * - Token OAuth do Google Drive (DRIVE_TOKEN_ENCRYPTION_KEY): o refresh
 *   token precisa ser USADO para renovar o acesso.
 * - Código de acesso do convite (ACCESS_CODE_ENCRYPTION_KEY): o painel
 *   precisa REEXIBIR o mesmo link/QR para o casal reenviar o convite sem
 *   invalidar o que já foi compartilhado (docs/PRODUCT.md, seção 5.2).
 *   Enquanto só o hash existia, "gerar novo link" era a única forma de ver
 *   um código — e ela revoga o anterior, o que inutiliza um QR já impresso
 *   e despachado.
 *
 * A propriedade de segurança mantida é a mesma nos dois casos: nunca em
 * texto plano em repouso (CLAUDE.md, seção 11). E a cifra nunca autentica —
 * a comparação no caminho do convidado é sempre pelo `codigo_hash`.
 */

function driveKey(): Buffer {
  return parseEncryptionKey(
    useRuntimeConfig().driveTokenEncryptionKey,
    'DRIVE_TOKEN_ENCRYPTION_KEY',
  )
}

function accessCodeKey(): Buffer {
  return parseEncryptionKey(
    useRuntimeConfig().accessCodeEncryptionKey,
    'ACCESS_CODE_ENCRYPTION_KEY',
  )
}

export function encryptToken(plain: string): string {
  return encryptWithKey(plain, driveKey())
}

export function decryptToken(payload: string): string {
  return decryptWithKey(payload, driveKey())
}

export function encryptAccessCode(code: string): string {
  return encryptWithKey(code, accessCodeKey())
}

export function decryptAccessCode(payload: string): string {
  return decryptWithKey(payload, accessCodeKey())
}
