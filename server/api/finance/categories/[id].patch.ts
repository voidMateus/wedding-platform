import { serverSupabaseClient } from '#supabase/server'
import { budgetCategoryPatchSchema } from '#shared/schemas/finance'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Categoria não informada.')
  }

  const input = await validateBody(event, budgetCategoryPatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.nome !== undefined) atualizacao.nome = input.nome
  if (input.valorPrevistoCentavos !== undefined) {
    atualizacao.valor_previsto_centavos = input.valorPrevistoCentavos
  }
  if (input.ordemExibicao !== undefined) atualizacao.ordem_exibicao = input.ordemExibicao
  // `null` é valor legítimo: é como o casal volta a cor para a automática.
  if (input.corPersonalizada !== undefined) {
    atualizacao.cor_personalizada = input.corPersonalizada ?? null
  }

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('categorias_orcamento')
    .update(atualizacao)
    .eq('id', id)
    // Redundante com a RLS, e proposital: a policy é a última linha de defesa,
    // não a primeira (CLAUDE.md, seção 4.2).
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Já existe uma categoria com esse nome.')
    }
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Categoria não encontrada.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.category.update',
    entityType: 'budget_category',
    entityId: data.id,
  })

  return data
})
