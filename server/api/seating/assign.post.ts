import { serverSupabaseClient } from '#supabase/server'
import { assentoInputSchema } from '#shared/schemas/mesas'

/**
 * Senta ou tira pessoas de uma mesa, em lote.
 *
 * `mesaId: null` é o "tirar da mesa" — mesma rota, porque é a mesma mutação.
 * Em lote e não um PATCH por pessoa: sentar uma família é um gesto só, e N
 * requisições fariam a ocupação piscar por estados intermediários que nunca
 * foram uma intenção do casal.
 *
 * Convidado e acompanhante avulso vêm em listas separadas porque são tabelas
 * diferentes — mas para a mesa são a mesma coisa, uma pessoa sentada, e é por
 * isso que a operação é uma só.
 *
 * **Não valida capacidade**: dez pessoas numa mesa de oito é um estado real do
 * planejamento ("depois eu resolvo"), e recusar aqui obrigaria o casal a sair
 * do produto para pensar. O excesso é exibido, nunca bloqueado.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, assentoInputSchema)

  const client = await serverSupabaseClient(event)

  // A mesa tem que ser deste casamento. O trigger do banco repete a checagem —
  // aqui é para a mensagem de erro ser útil, lá é para ser impossível.
  if (input.mesaId) {
    const { data: mesa, error } = await client
      .from('mesas')
      .select('id')
      .eq('id', input.mesaId)
      .eq('casamento_id', weddingId)
      .maybeSingle()

    if (error) throw badRequestError(error.message)
    if (!mesa) throw notFoundError('Mesa não encontrada.')
  }

  let sentados = 0

  if (input.convidadoIds.length) {
    const { data, error } = await client
      .from('convidados')
      .update({ mesa_id: input.mesaId })
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .in('id', input.convidadoIds)
      .select('id')

    // Rascunho da lista nunca senta: a constraint
    // `convidados_em_consideracao_sem_mesa` recusa, e o erro vira uma frase que
    // diz o que fazer em vez do texto do Postgres.
    if (error) {
      if (error.message.includes('convidados_em_consideracao_sem_mesa')) {
        throw badRequestError(
          'Quem está em consideração não senta à mesa — promova a convidado primeiro.',
        )
      }
      throw badRequestError(error.message)
    }
    sentados += (data ?? []).length
  }

  if (input.avulsoIds.length) {
    const { data, error } = await client
      .from('acompanhantes_avulsos')
      .update({ mesa_id: input.mesaId })
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .in('id', input.avulsoIds)
      .select('id')

    if (error) throw badRequestError(error.message)
    sentados += (data ?? []).length
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: input.mesaId ? 'table.seat' : 'table.unseat',
    entityType: 'table',
    entityId: input.mesaId ?? weddingId,
    // Sem nome de convidado — dado pessoal não vai para log em texto pleno.
    metadata: { total: sentados },
  })

  return { atualizados: sentados }
})
