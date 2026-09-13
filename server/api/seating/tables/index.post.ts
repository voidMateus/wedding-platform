import { serverSupabaseClient } from '#supabase/server'
import { mesaInputSchema } from '#shared/schemas/mesas'

/**
 * Cria uma mesa.
 *
 * O formulário não pergunta POSIÇÃO — ninguém sabe de cabeça em que
 * centímetro do salão a mesa fica, e posicionar é outro gesto, na planta. Mas
 * "nasce em (0,0)" também não serve: doze mesas criadas em sequência ficariam
 * empilhadas no mesmo ponto, e o casal teria que arrastar uma a uma só para
 * conseguir VER que existem doze. A mesa nasce na próxima vaga de uma grade —
 * um lugar arbitrário, mas visível e separado dos vizinhos.
 */
const COLUNAS_DA_GRADE = 5
const ESPACAMENTO_CM = 250

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, mesaInputSchema)

  const client = await serverSupabaseClient(event)

  const { count } = await client
    .from('mesas')
    .select('*', { count: 'exact', head: true })
    .eq('casamento_id', weddingId)

  const indice = count ?? 0

  const { data, error } = await client
    .from('mesas')
    .insert({
      casamento_id: weddingId,
      nome: input.nome,
      capacidade: input.capacidade,
      formato: input.formato,
      largura_cm: input.larguraCm,
      profundidade_cm: input.profundidadeCm,
      posicao_x_cm: (indice % COLUNAS_DA_GRADE) * ESPACAMENTO_CM,
      posicao_y_cm: Math.floor(indice / COLUNAS_DA_GRADE) * ESPACAMENTO_CM,
      observacao: input.observacao ?? null,
    })
    .select('id, nome')
    .single()

  // Nome repetido tem índice único: "Mesa 7" duas vezes é sempre erro de
  // digitação, e descobrir isso na hora de imprimir o mapa é tarde.
  if (error) {
    if (error.code === '23505') {
      throw badRequestError('Já existe uma mesa com esse nome.')
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'table.create',
    entityType: 'table',
    entityId: data.id,
    metadata: { nome: data.nome, capacidade: input.capacidade },
  })

  setResponseStatus(event, 201)
  return { id: data.id }
})
