import { serverSupabaseClient } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({ archived: z.boolean() })

/**
 * Arquiva/desarquiva o grupo. Diferente de convites — que têm `arquivado_em`
 * separado de `excluido_em` porque um convite arquivado ainda é uma unidade de
 * RSVP com histórico próprio —, aqui arquivar É o soft delete: grupo é etiqueta
 * organizacional, não tem estado intermediário entre "em uso" e "fora de uso".
 *
 * Convive com DELETE /api/groups/[id], que faz a mesma escrita no sentido
 * "arquivar": o DELETE continua sendo o verbo REST da operação e é o que a
 * suíte de integração cobre; esta rota existe porque só ela sabe voltar atrás,
 * e a UI usa uma só chamada para os dois sentidos.
 *
 * Arquivar em cascata: uma subdivisão não pode ficar ativa sob um pai
 * arquivado — a árvore do Modo Lista a mostraria pendurada em nada, e
 * `validar_grupo_pai()` já proíbe criar subdivisão sob pai arquivado, então o
 * estado seria inalcançável por qualquer outro caminho.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const { archived } = await validateBody(event, bodySchema)

  const client = await serverSupabaseClient(event)

  // Precisa vir antes da escrita: no sentido "desarquivar" é este valor que
  // identifica quais subdivisões foram arquivadas junto com o pai (ver
  // abaixo), e depois do update ele já não existe.
  const { data: atual, error: erroAtual } = await client
    .from('grupos')
    .select('id, excluido_em')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (erroAtual) {
    throw badRequestError(erroAtual.message)
  }
  if (!atual) {
    throw notFoundError('Grupo não encontrado.')
  }

  const excluidoEmAnterior = atual.excluido_em
  const excluidoEm = archived ? new Date().toISOString() : null

  // Sem `.is('excluido_em', null)` no filtro: desarquivar precisa alcançar
  // justamente a linha que está arquivada.
  const { data, error } = await client
    .from('grupos')
    .update({ excluido_em: excluidoEm })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Grupo não encontrado.')
  }

  // As subdivisões arquivadas pela cascata recebem exatamente o timestamp do
  // pai, e é isso que torna o "desarquivar" correto sem coluna nova: ao voltar
  // atrás, só são restauradas as que casam com o timestamp que o pai tinha.
  // Uma subdivisão que o casal já havia arquivado sozinha antes tem outro
  // valor e continua arquivada — desarquivar o pai não ressuscita decisão que
  // ninguém desfez.
  let subdivisoesAfetadas = 0
  if (archived) {
    const { data: filhas, error: erroFilhas } = await client
      .from('grupos')
      .update({ excluido_em: excluidoEm })
      .eq('casamento_id', weddingId)
      .eq('grupo_pai_id', id)
      .is('excluido_em', null)
      .select('id')

    if (erroFilhas) {
      throw badRequestError(erroFilhas.message)
    }
    subdivisoesAfetadas = (filhas ?? []).length
  } else if (excluidoEmAnterior) {
    const { data: filhas, error: erroFilhas } = await client
      .from('grupos')
      .update({ excluido_em: null })
      .eq('casamento_id', weddingId)
      .eq('grupo_pai_id', id)
      .eq('excluido_em', excluidoEmAnterior)
      .select('id')

    if (erroFilhas) {
      throw badRequestError(erroFilhas.message)
    }
    subdivisoesAfetadas = (filhas ?? []).length
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: archived ? 'group.archive' : 'group.unarchive',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.nome, subdivisionsAffected: subdivisoesAfetadas },
  })

  return data
})
