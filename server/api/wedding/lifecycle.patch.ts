import { serverSupabaseClient } from '#supabase/server'
import { weddingLifecycleSchema } from '#shared/schemas/wedding'

/**
 * Publicar e despublicar o site (docs/fase4-onboarding.md seção 8).
 *
 * Endpoint próprio pelo mesmo motivo dos lembretes e do teto do Financeiro:
 * `PATCH /api/wedding` reescreve o conjunto completo de configurações do
 * evento, e mandar o formulário inteiro a partir de outra tela é como um campo
 * alheio acaba sobrescrito por um valor velho — aqui a outra tela é o roteiro
 * de Primeiros passos, que não tem formulário nenhum.
 *
 * `arquivado` não é aceito (ver `weddingLifecycleSchema`).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, weddingLifecycleSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('casamentos')
    .update({ status_ciclo_vida: input.statusCicloVida })
    .eq('id', weddingId)
    .select('status_ciclo_vida')
    .single()

  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.lifecycle.update',
    entityType: 'wedding',
    entityId: weddingId,
    // Tirar o site do ar derruba o link e o QR que já foram compartilhados com
    // os convidados; pôr no ar expõe a lista de presentes e o RSVP. É
    // exatamente o tipo de mudança que precisa ter dono e data.
    metadata: { statusCicloVida: input.statusCicloVida },
  })

  return data
})
