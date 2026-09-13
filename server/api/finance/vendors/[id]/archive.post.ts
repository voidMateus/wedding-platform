import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const bodySchema = z.object({ arquivado: z.boolean() })

/**
 * Arquiva/desarquiva um fornecedor.
 *
 * Mesmo desenho do arquivamento de categoria e de `grupos`: arquivar É o soft
 * delete, e esta rota existe porque só ela sabe voltar atrás. Sem ela, o
 * fornecedor sumia da tela sem caminho de retorno — junto com o contato que o
 * casal levou semanas para achar.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Fornecedor não informado.')
  }

  const { arquivado } = await validateBody(event, bodySchema)
  const client = await serverSupabaseClient(event)

  if (arquivado) {
    const { count, error: erroContagem } = await client
      .from('despesas')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .eq('fornecedor_id', id)
      .is('excluido_em', null)

    if (erroContagem) {
      throw badRequestError(erroContagem.message)
    }
    if (count && count > 0) {
      throw conflictError(
        `Este fornecedor está ligado a ${count} gasto${count === 1 ? '' : 's'} do orçamento. Desvincule antes de arquivar.`,
      )
    }
  }

  const { data, error } = await client
    .from('fornecedores')
    .update({ excluido_em: arquivado ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Fornecedor não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: arquivado ? 'finance.vendor.archive' : 'finance.vendor.restore',
    entityType: 'vendor',
    entityId: id,
  })

  return data
})
