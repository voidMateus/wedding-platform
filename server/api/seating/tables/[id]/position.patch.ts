import { serverSupabaseClient } from '#supabase/server'
import { mesaPosicaoSchema } from '#shared/schemas/mesas'

/**
 * Só posição e rotação.
 *
 * Endpoint estreito de propósito: arrastar gera muitos salvamentos, e um PATCH
 * gordo carregaria junto nome e capacidade lidos quando a tela montou — é
 * assim que um campo alheio acaba sobrescrito por um valor velho de outra aba.
 * Mesma lição do teto global do Financeiro não entrar em `PATCH /api/wedding`.
 *
 * auditoria dispensada: mover uma mesa no desenho não é ação administrativa
 * sensível (CLAUDE.md seção 11 pede auditoria de exclusão e permissão), e
 * registrar cada arrasto encheria a trilha de ruído que esconderia o resto. A
 * varredura de `tests/unit/server/auditoria-completa.spec.ts` aceita esta
 * frase exata — é assim que a exceção fica declarada em vez de esquecida.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw badRequestError('id da mesa não informado.')

  const input = await validateBody(event, mesaPosicaoSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('mesas')
    .update({
      posicao_x_cm: input.posicaoXCm,
      posicao_y_cm: input.posicaoYCm,
      ...(input.rotacaoGraus === undefined ? {} : { rotacao_graus: input.rotacaoGraus }),
    })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .select('id')
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Mesa não encontrada.')

  return { id }
})
