import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

/**
 * Gera um novo código de acesso para um convite (CLAUDE.md, seção
 * 14.5/19.2 — "Convites e Comunicações"). Se já existir um token ativo para
 * o mesmo convite, ele é revogado antes — só um token ativo por convite por
 * vez (índice único parcial em guest_access_tokens).
 *
 * O código em texto plano só existe na resposta desta chamada — nunca é
 * persistido nem pode ser recuperado depois (CLAUDE.md, seção 11/14.5).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestAccessTokenGenerateSchema)

  const client = await serverSupabaseClient(event)

  const { data: invite, error: inviteError } = await client
    .from('invites')
    .select('id')
    .eq('id', input.inviteId)
    .eq('wedding_id', weddingId)
    .is('deleted_at', null)
    .maybeSingle()

  if (inviteError) {
    throw badRequestError(inviteError.message)
  }
  if (!invite) {
    throw notFoundError('Convite não encontrado.')
  }

  const { error: revokeError } = await client
    .from('guest_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('wedding_id', weddingId)
    .eq('invite_id', input.inviteId)
    .is('revoked_at', null)

  if (revokeError) {
    throw badRequestError(revokeError.message)
  }

  const code = generateAccessCode()
  const codeHash = hashAccessCode(code)

  const { data, error } = await client
    .from('guest_access_tokens')
    .insert({
      wedding_id: weddingId,
      invite_id: input.inviteId,
      code_hash: codeHash,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await client.from('invite_events').insert({
    wedding_id: weddingId,
    invite_id: input.inviteId,
    event_type: 'token.generated',
    metadata: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.generate',
    entityType: 'guest_access_token',
    entityId: data.id,
    metadata: { inviteId: input.inviteId },
  })

  setResponseStatus(event, 201)
  return {
    id: data.id,
    code,
    inviteId: data.invite_id,
    createdAt: data.created_at,
  }
})
