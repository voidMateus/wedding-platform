import { serverSupabaseClient } from '#supabase/server'
import { elementoInputSchema } from '#shared/schemas/mesas'

/**
 * Edita um elemento do salão — inclusive posição.
 *
 * Diferente de `mesas`, aqui posição NÃO tem endpoint próprio: o elemento não
 * tem formulário de edição separado do arrasto (é tipo, tamanho e lugar), então
 * não existe o conflito que o endpoint estreito da mesa evita.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequestError('id do elemento não informado.')

  const input = await validateBody(event, elementoInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('elementos_planta')
    .update({
      tipo: input.tipo,
      nome: input.nome ?? null,
      largura_cm: input.larguraCm,
      profundidade_cm: input.profundidadeCm,
      posicao_x_cm: input.posicaoXCm,
      posicao_y_cm: input.posicaoYCm,
      rotacao_graus: input.rotacaoGraus,
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id')
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Elemento não encontrado.')

  return { id }
})
