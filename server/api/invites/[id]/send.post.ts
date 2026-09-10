import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// `.default({})` no OBJETO, não só no campo: `readBody` devolve `undefined`
// quando a requisição não tem corpo, e `z.object({...})` recusa `undefined`
// — o default de campo só age sobre chave ausente DENTRO de um objeto. Sem
// isso, `POST /send` sem corpo passava a responder 400, quebrando "Marcar
// como enviado" na janela de deploy (o código publicado não manda o campo).
// Achado pelo CI: a suíte de integração é a única que exercita esse caminho.
const bodySchema = z.object({ sent: z.boolean().default(true) }).default({})

/**
 * Marca/desmarca o convite como enviado — grava `enviado_em` e o evento na
 * Linha do Tempo.
 *
 * Aceita os dois sentidos porque "Enviado" é informação MANUAL: o sistema não
 * comprova entrega nenhuma, é o casal dizendo que mandou. Um clique errado
 * ficava permanente e empurrava o convite para um estágio falso do funil, sem
 * nenhum caminho de volta pela interface. Mesmo desenho de arquivar/desarquivar
 * (`archive.post.ts`), pelo mesmo motivo: registro reversível do casal, não
 * fato comprovado pelo sistema.
 *
 * A chamada antiga (sem corpo nenhum) continua funcionando — ver a nota do
 * schema abaixo, que é onde isso quase deu errado.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convite não informado.')
  }

  const { sent } = await validateBody(event, bodySchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('convites')
    // So `enviado_em`: `status_convite` era a terceira representacao do mesmo
    // fato (coluna + timestamp + evento no historico) e ficou obsoleta com o
    // funil de estagios, que le o timestamp.
    .update({ enviado_em: sent ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (!data) throw notFoundError('Convite não encontrado.')

  // Os dois sentidos entram no historico: desmarcar tambem e algo que
  // aconteceu, e o log e append-only justamente para nao perder a correcao.
  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: id,
    tipo_evento: sent ? 'token.sent' : 'token.unsent',
    metadados: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: sent ? 'invite.send' : 'invite.unsend',
    entityType: 'invite',
    entityId: id,
    metadata: {},
  })

  return data
})
