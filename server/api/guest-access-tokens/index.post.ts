import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

/**
 * Gera um novo código de acesso para um convite (CLAUDE.md, seção
 * 14.5/19.2 — "Convites e Comunicações"). Se já existir um token ativo para
 * o mesmo convite, ele é revogado antes — só um token ativo por convite por
 * vez (índice único parcial em credenciais_acesso_convite).
 *
 * O código em texto plano só existe na resposta desta chamada — nunca é
 * persistido nem pode ser recuperado depois (CLAUDE.md, seção 11/14.5).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestAccessTokenGenerateSchema)

  const client = await serverSupabaseClient(event)

  const { data: invite, error: inviteError } = await client
    .from('convites')
    .select('id')
    .eq('id', input.conviteId)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (inviteError) {
    throw badRequestError(inviteError.message)
  }
  if (!invite) {
    throw notFoundError('Convite não encontrado.')
  }

  const { error: revokeError } = await client
    .from('credenciais_acesso_convite')
    .update({ revogado_em: new Date().toISOString() })
    .eq('casamento_id', weddingId)
    .eq('convite_id', input.conviteId)
    .is('revogado_em', null)

  if (revokeError) {
    throw badRequestError(revokeError.message)
  }

  const code = generateAccessCode()
  const codeHash = hashAccessCode(code)

  const { data, error } = await client
    .from('credenciais_acesso_convite')
    .insert({
      casamento_id: weddingId,
      convite_id: input.conviteId,
      codigo_hash: codeHash,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: input.conviteId,
    tipo_evento: 'token.generated',
    metadados: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.generate',
    entityType: 'guest_access_token',
    entityId: data.id,
    metadata: { inviteId: input.conviteId },
  })

  setResponseStatus(event, 201)
  return {
    id: data.id,
    code,
    inviteId: data.convite_id,
    createdAt: data.created_at,
  }
})
