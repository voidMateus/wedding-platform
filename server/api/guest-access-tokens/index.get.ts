import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenStatusQuerySchema } from '#shared/schemas/guest-access-tokens'

/**
 * Consulta se existe um token ativo para um convite — nunca retorna o
 * código em texto plano (não é recuperável depois de gerado, CLAUDE.md
 * seção 14.5). Usado pela UI para decidir entre "gerar link" e "link já
 * ativo, gerado em X".
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const query = validateQuery(event, guestAccessTokenStatusQuerySchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('credenciais_acesso_convite')
    .select('id, created_at')
    .eq('casamento_id', weddingId)
    .eq('convite_id', query.conviteId)
    .is('revogado_em', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return { active: Boolean(data), id: data?.id ?? null, createdAt: data?.created_at ?? null }
})
