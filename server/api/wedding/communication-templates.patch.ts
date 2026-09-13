import { serverSupabaseClient } from '#supabase/server'
import { modelosComunicacaoSchema } from '#shared/schemas/comunicacoes'

/**
 * Os modelos de mensagem do casal (`casamentos.config_comunicacao`).
 *
 * Endpoint próprio, e não um campo em `PATCH /api/wedding`, pelo mesmo motivo
 * do teto global do Financeiro: aquele endpoint reescreve o conjunto completo
 * de configurações do evento de uma vez (é o "salvar" da tela de
 * Configurações), e mandar o formulário inteiro a partir de outra tela é como
 * um campo alheio acaba sobrescrito por um valor velho carregado noutro lugar.
 *
 * O corpo substitui o objeto inteiro, e isso é deliberado: são três textos que
 * o editor mostra juntos e salva juntos. Campo ausente volta ao padrão da
 * plataforma na leitura (`modeloDoTipo`) — "restaurar o padrão" é apagar o
 * texto, nunca um botão que grava a cópia do padrão como se fosse do casal.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, modelosComunicacaoSchema)

  // String vazia não é gravada: ausente e vazio significam a mesma coisa para
  // quem lê ("use o padrão"), e guardar as duas formas criaria dois jeitos de
  // escrever o mesmo estado.
  const modelos = Object.fromEntries(
    Object.entries(input).filter(([, texto]) => Boolean(texto?.trim())),
  )

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('casamentos')
    .update({ config_comunicacao: modelos })
    .eq('id', weddingId)
    .select('config_comunicacao')
    .single()

  if (error) throw badRequestError(error.message)

  await recordAuditLog(event, weddingId, memberId, {
    action: 'wedding.communication_templates.update',
    entityType: 'wedding',
    entityId: weddingId,
    // Só quais tipos foram personalizados — o TEXTO da mensagem não vai para o
    // log: ele cita o nome do convidado e o link do convite.
    metadata: { tipos: Object.keys(modelos) },
  })

  return data.config_comunicacao
})
