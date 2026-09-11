import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const bodySchema = z.object({ arquivada: z.boolean() })

/**
 * Arquiva/desarquiva uma categoria do orçamento.
 *
 * Mesmo desenho de `POST /api/groups/[id]/archive`: arquivar É o soft delete
 * (categoria não tem estado intermediário entre "em uso" e "fora de uso"), o
 * `DELETE` continua sendo o verbo REST do sentido "arquivar", e esta rota
 * existe porque só ela sabe voltar atrás — sem ela, arquivar era um caminho
 * sem volta, e o histórico das despesas ficava preso numa categoria
 * inalcançável.
 *
 * Desarquivar recusa quando já existe outra categoria ativa com o mesmo nome:
 * o índice único parcial só vale entre ativas, então restaurar "Buffet" com um
 * "Buffet" novo em uso criaria a duplicata que o índice existe para impedir.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Categoria não informada.')
  }

  const { arquivada } = await validateBody(event, bodySchema)
  const client = await serverSupabaseClient(event)

  const { data: atual, error: erroAtual } = await client
    .from('categorias_orcamento')
    .select('id, nome, excluido_em')
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (erroAtual) {
    throw badRequestError(erroAtual.message)
  }
  if (!atual) {
    throw notFoundError('Categoria não encontrada.')
  }

  if (arquivada) {
    const { count, error: erroContagem } = await client
      .from('despesas')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .eq('categoria_id', id)
      .is('excluido_em', null)

    if (erroContagem) {
      throw badRequestError(erroContagem.message)
    }
    if (count && count > 0) {
      throw conflictError(
        `Esta categoria ainda tem ${count} despesa${count === 1 ? '' : 's'}. Mova ou exclua antes de arquivar.`,
      )
    }
  } else {
    const { data: conflito, error: erroConflito } = await client
      .from('categorias_orcamento')
      .select('id')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .ilike('nome', atual.nome)
      .maybeSingle()

    if (erroConflito) {
      throw badRequestError(erroConflito.message)
    }
    if (conflito) {
      throw conflictError(
        `Já existe uma categoria ativa chamada "${atual.nome}". Renomeie uma das duas antes de restaurar.`,
      )
    }
  }

  const { data, error } = await client
    .from('categorias_orcamento')
    .update({ excluido_em: arquivada ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: arquivada ? 'finance.category.archive' : 'finance.category.restore',
    entityType: 'budget_category',
    entityId: id,
  })

  return data
})
