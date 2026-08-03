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
    .from('guest_access_tokens')
    .select('id, created_at')
    .eq('wedding_id', weddingId)
    .eq('invite_id', query.inviteId)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return { active: Boolean(data), id: data?.id ?? null, createdAt: data?.created_at ?? null }
})
