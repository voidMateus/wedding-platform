import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenStatusQuerySchema } from '#shared/schemas/guest-access-tokens'

/**
 * Consulta o token ativo de um convite e reexibe o código para o painel —
 * é este o caminho para reenviar um convite sem invalidar o link/QR já
 * compartilhado (docs/PRODUCT.md, seção 5.2). Leitura administrativa: o
 * `client` carrega o JWT do membro, então a RLS por `casamento_id` é quem
 * garante o isolamento (CLAUDE.md, seção 4.2) — nunca `service_role` aqui.
 *
 * `code` vem nulo quando a credencial foi criada antes da coluna
 * `codigo_cifrado` existir, ou quando a cifra não pode ser aberta (chave
 * ausente/rotacionada). Nesses casos o token continua válido para o
 * convidado; só a reexibição é impossível, e o painel oferece gerar um novo.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const query = validateQuery(event, guestAccessTokenStatusQuerySchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('credenciais_acesso_convite')
    .select('id, created_at, codigo_cifrado')
    .eq('casamento_id', weddingId)
    .eq('convite_id', query.conviteId)
    .is('revogado_em', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return {
    active: Boolean(data),
    id: data?.id ?? null,
    createdAt: data?.created_at ?? null,
    code: data?.codigo_cifrado ? tryDecryptAccessCode(data.codigo_cifrado) : null,
  }
})

/**
 * Cifra ilegível é falha de configuração, não de requisição: degrada para
 * "não reexibível" em vez de derrubar a tela inteira do convite. O log nunca
 * inclui o payload (CLAUDE.md, seção 11).
 */
function tryDecryptAccessCode(payload: string): string | null {
  try {
    return decryptAccessCode(payload)
  } catch {
    console.error(
      '[guest-access-tokens] falha ao decifrar codigo_cifrado — ACCESS_CODE_ENCRYPTION_KEY ausente ou rotacionada.',
    )
    return null
  }
}
