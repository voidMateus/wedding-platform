import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenStatusQuerySchema } from '#shared/schemas/guest-access-tokens'

/**
 * Consulta se existe um token ativo para um convidado/grupo — nunca retorna
 * o código em texto plano (não é recuperável depois de gerado, CLAUDE.md
 * seção 14.5). Usado pela UI para decidir entre "gerar link" e "link já
 * ativo, gerado em X".
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const query = validateQuery(event, guestAccessTokenStatusQuerySchema)

  const client = await serverSupabaseClient(event)

  let tokenQuery = client
    .from('guest_access_tokens')
    .select('id, created_at')
    .eq('wedding_id', weddingId)
    .is('revoked_at', null)

  tokenQuery = query.guestId
    ? tokenQuery.eq('guest_id', query.guestId)
    : tokenQuery.eq('group_id', query.groupId as string)

  const { data, error } = await tokenQuery.maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return { active: Boolean(data), id: data?.id ?? null, createdAt: data?.created_at ?? null }
})
