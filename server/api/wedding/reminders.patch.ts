import { serverSupabaseClient } from '#supabase/server'
import { configLembretesSchema } from '#shared/schemas/lembretes'

/**
 * O que a plataforma pode mandar sozinha (`casamentos.config_lembretes`).
 *
 * Endpoint próprio pelo mesmo motivo dos modelos de mensagem e do teto do
 * Financeiro: `PATCH /api/wedding` reescreve o conjunto completo de
 * configurações do evento de uma vez, e mandar o formulário inteiro a partir
 * de outra tela é como um campo alheio acaba sobrescrito por um valor velho.
 *
 * O corpo substitui o objeto inteiro — são dois interruptores que a tela mostra
 * juntos e salva juntos.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, configLembretesSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('casamentos')
    .update({ config_lembretes: input })
    .eq('id', weddingId)
    .select('config_lembretes')
    .single()

  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.reminders.update',
    entityType: 'wedding',
    entityId: weddingId,
    // Ligar e desligar envio automático é exatamente o tipo de mudança que
    // precisa ter dono e data: é a plataforma passando a escrever para a lista
    // de convidados sem ninguém clicar.
    metadata: {
      rsvpAtivo: input.rsvp.ativo,
      rsvpDiasAntes: input.rsvp.diasAntes,
      pagamentosAtivo: input.pagamentos.ativo,
      pagamentosDiasAntes: input.pagamentos.diasAntes,
    },
  })

  return data.config_lembretes
})
