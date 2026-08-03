import { serverSupabaseClient } from '#supabase/server'
import { inviteInputSchema } from '#shared/schemas/invites'

/**
 * Cria um convite vazio (sem convidados ainda) — usado quando o casal cria
 * o convite direto em /admin/convites, fora do wizard de cadastro de
 * convidado (que já cria o convite junto via sync_guest_party — CLAUDE.md,
 * seção 12.1).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, inviteInputSchema)

  const client = await serverSupabaseClient(event)
  const internalCode = `CONV-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

  const { data, error } = await client
    .from('invites')
    .insert({
      wedding_id: weddingId,
      name: input.name,
      notes: input.notes || null,
      max_companions: input.maxCompanions ?? null,
      internal_code: internalCode,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await client.from('invite_events').insert({
    wedding_id: weddingId,
    invite_id: data.id,
    event_type: 'invite.created',
    metadata: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.create',
    entityType: 'invite',
    entityId: data.id,
    metadata: { name: data.name },
  })

  setResponseStatus(event, 201)
  return data
})
