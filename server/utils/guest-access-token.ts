import { createHash, randomBytes } from 'node:crypto'

// Código de acesso do convidado (CLAUDE.md, seção 14.5): entropia suficiente
// para não ser adivinhável por força bruta, nunca persistido em texto plano —
// só o hash (codigo_hash) é gravado em credenciais_acesso_convite.

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

export interface ResolvedGuestToken {
  casamentoId: string
  conviteId: string
}

/**
 * Resolve um código em texto plano para o convite/casamento correspondente
 * (CLAUDE.md, seção 14.3) — usado por todo endpoint do caminho do convidado
 * (RSVP, presentes). Retorna null se o código não existe ou o token foi
 * revogado; nunca lança, para o handler decidir a mensagem de erro
 * apropriada ao contexto.
 */
export async function resolveGuestToken(
  client: Awaited<ReturnType<typeof supabaseAdmin>>,
  code: string,
): Promise<ResolvedGuestToken | null> {
  const codeHash = hashAccessCode(code)

  const { data: token, error } = await client
    .from('credenciais_acesso_convite')
    .select('casamento_id, convite_id, revogado_em')
    .eq('codigo_hash', codeHash)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!token || token.revogado_em) {
    return null
  }

  return { casamentoId: token.casamento_id, conviteId: token.convite_id }
}
