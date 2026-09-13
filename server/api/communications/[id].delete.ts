import { serverSupabaseClient } from '#supabase/server'

/**
 * Apaga um registro de envio — **só de canal `outro`**.
 *
 * A assimetria é o ponto, e é a mesma de "Aberto é o único estágio comprovado
 * pelo sistema": registro de canal `outro` é uma DECLARAÇÃO do casal
 * ("entreguei em mãos"), e declarar por engano precisa ter saída. Envio feito
 * pelo sistema (WhatsApp, e-mail) é um fato que aconteceu — apagá-lo seria
 * reescrever a história, e o funil passaria a mentir sobre o que o convidado
 * recebeu.
 *
 * A regra mora em DOIS lugares de propósito: a policy de RLS
 * (`comunicacoes_delete_membro_canal_outro`) é o portão real, e a checagem
 * aqui existe só para o erro dizer o motivo. Sem ela, um envio de WhatsApp
 * responderia 404 — tecnicamente verdade (a linha não é visível para o
 * delete), mas "não encontrado" mandaria o casal procurar um bug que não
 * existe.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do registro não informado.')
  }

  const client = await serverSupabaseClient(event)

  const { data: registro, error: leituraError } = await client
    .from('comunicacoes')
    .select('id, canal, convite_id, tipo')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (leituraError) throw badRequestError(leituraError.message)
  if (!registro) throw notFoundError('Registro de envio não encontrado.')

  if (registro.canal !== 'outro') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message:
        'Este envio foi feito pela plataforma e não pode ser apagado — só registros marcados como "outro canal" têm volta.',
    })
  }

  const { error } = await client.from('comunicacoes').delete().eq('id', id)
  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'communication.delete',
    entityType: 'communication',
    entityId: id,
    metadata: { inviteId: registro.convite_id, tipo: registro.tipo },
  })

  return { id }
})
