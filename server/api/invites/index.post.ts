import { serverSupabaseClient } from '#supabase/server'
import { inviteInputSchema } from '#shared/schemas/invites'

/**
 * Cria um convite vazio (sem convidados ainda) — usado quando o casal cria
 * o convite direto em /admin/convites, fora do wizard de cadastro de
 * convidado (que já cria o convite junto via sincronizar_nucleo_convidado —
 * CLAUDE.md, seção 12.1).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, inviteInputSchema)

  const client = await serverSupabaseClient(event)
  const internalCode = `CONV-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

  const { data, error } = await client
    .from('convites')
    .insert({
      casamento_id: weddingId,
      nome: input.nome,
      observacoes: input.observacoes || null,
      max_acompanhantes: input.maxAcompanhantes ?? null,
      codigo_interno: internalCode,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: data.id,
    tipo_evento: 'invite.created',
    metadados: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'invite.create',
    entityType: 'invite',
    entityId: data.id,
    metadata: { name: data.nome },
  })

  setResponseStatus(event, 201)
  return data
})
