import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { budgetCategoryInputSchema } from '#shared/schemas/finance'
import { CATEGORIAS_ORCAMENTO_SUGERIDAS } from '#shared/orcamento-categorias'

const querySchema = z.object({
  /** `?sugeridas=1` insere o catálogo inteiro de uma vez, do estado vazio. */
  sugeridas: z.string().optional(),
})

/**
 * Cria uma categoria — ou, com `?sugeridas=1`, o catálogo inicial inteiro.
 *
 * O catálogo é inserido por AÇÃO do casal, nunca por trigger na criação do
 * casamento: a lista de um casamento de 40 pessoas não é a de um de 300, e
 * chegar com quatorze linhas que ninguém pediu é o oposto de "liberdade de
 * planilha".
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { sugeridas } = validateQuery(event, querySchema)
  const client = await serverSupabaseClient(event)

  if (sugeridas) {
    const { data: existentes, error: leituraError } = await client
      .from('categorias_orcamento')
      .select('nome')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)

    if (leituraError) {
      throw badRequestError(leituraError.message)
    }

    // Pular as que já existem em vez de deixar o índice único estourar: o
    // casal pode ter criado "Buffet" à mão antes de clicar no botão, e falhar
    // a inserção inteira por causa disso seria um erro sem conserto na tela.
    const jaExistem = new Set((existentes ?? []).map((linha) => linha.nome.toLowerCase()))
    const novas = CATEGORIAS_ORCAMENTO_SUGERIDAS.filter(
      (categoria) => !jaExistem.has(categoria.nome.toLowerCase()),
    )

    if (novas.length === 0) {
      return { data: [] }
    }

    const { data, error } = await client
      .from('categorias_orcamento')
      .insert(
        novas.map((categoria) => ({
          casamento_id: weddingId,
          nome: categoria.nome,
          ordem_exibicao: categoria.ordemExibicao,
        })),
      )
      .select()

    if (error) {
      throw badRequestError(error.message)
    }

    // A entidade da semeadura é o casamento, não uma categoria: são catorze
    // linhas de uma vez, e eleger uma delas como "a" entidade seria mentira.
    await recordAuditLog(event, weddingId, memberId, {
      action: 'finance.category.seed',
      entityType: 'wedding',
      entityId: weddingId,
      metadata: { quantidade: data.length },
    })

    setResponseStatus(event, 201)
    return { data }
  }

  const input = await validateBody(event, budgetCategoryInputSchema)

  const { data, error } = await client
    .from('categorias_orcamento')
    .insert({
      casamento_id: weddingId,
      nome: input.nome,
      valor_previsto_centavos: input.valorPrevistoCentavos,
      ordem_exibicao: input.ordemExibicao,
    })
    .select()
    .single()

  if (error) {
    // 23505 = índice único parcial de nome por casamento.
    if (error.code === '23505') {
      throw conflictError('Já existe uma categoria com esse nome.')
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.category.create',
    entityType: 'budget_category',
    entityId: data.id,
    metadata: { nome: data.nome },
  })

  setResponseStatus(event, 201)
  return data
})
