import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

/**
 * Gera um novo código de acesso para um convidado ou grupo (CLAUDE.md, seção
 * 14.5/19.2 — "Convites e Comunicações"). Se já existir um token ativo para
 * o mesmo guest/group, ele é revogado antes — só um token ativo por
 * convidado/grupo por vez (índice único parcial em guest_access_tokens).
 *
 * O código em texto plano só existe na resposta desta chamada — nunca é
 * persistido nem pode ser recuperado depois (CLAUDE.md, seção 11/14.5).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestAccessTokenGenerateSchema)

  const client = await serverSupabaseClient(event)

  if (input.guestId) {
    const { data: guest, error: guestError } = await client
      .from('guests')
      .select('id')
      .eq('id', input.guestId)
      .eq('wedding_id', weddingId)
      .is('deleted_at', null)
      .maybeSingle()

    if (guestError) {
      throw badRequestError(guestError.message)
    }
    if (!guest) {
      throw notFoundError('Convidado não encontrado.')
    }
  } else if (input.groupId) {
    const { data: group, error: groupError } = await client
      .from('guest_groups')
      .select('id')
      .eq('id', input.groupId)
      .eq('wedding_id', weddingId)
      .is('deleted_at', null)
      .maybeSingle()

    if (groupError) {
      throw badRequestError(groupError.message)
    }
    if (!group) {
      throw notFoundError('Grupo não encontrado.')
    }
  }

  let revokeQuery = client
    .from('guest_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('wedding_id', weddingId)
    .is('revoked_at', null)

  revokeQuery = input.guestId
    ? revokeQuery.eq('guest_id', input.guestId)
    : revokeQuery.eq('group_id', input.groupId as string)

  const { error: revokeError } = await revokeQuery
  if (revokeError) {
    throw badRequestError(revokeError.message)
  }

  const code = generateAccessCode()
  const codeHash = hashAccessCode(code)

  const { data, error } = await client
    .from('guest_access_tokens')
    .insert({
      wedding_id: weddingId,
      guest_id: input.guestId ?? null,
      group_id: input.groupId ?? null,
      code_hash: codeHash,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.generate',
    entityType: 'guest_access_token',
    entityId: data.id,
    metadata: { guestId: input.guestId ?? null, groupId: input.groupId ?? null },
  })

  setResponseStatus(event, 201)
  return {
    id: data.id,
    code,
    guestId: data.guest_id,
    groupId: data.group_id,
    createdAt: data.created_at,
  }
})
