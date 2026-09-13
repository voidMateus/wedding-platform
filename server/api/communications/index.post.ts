import { serverSupabaseClient } from '#supabase/server'
import { comunicacaoRegistroSchema } from '#shared/schemas/comunicacoes'
import { ROTULOS_TIPO_COMUNICACAO } from '#shared/utils/modelo-comunicacao'

/**
 * Registra um envio: save the date, convite ou lembrete, por canal.
 *
 * Substitui o `POST /api/invites/[id]/send`, que marcava `convites.enviado_em`
 * à mão. O fato passou a ter uma linha própria, e `enviado_em` voltou a ser o
 * que sempre deveria ter sido: uma leitura dos fatos (`convites_com_resumo`).
 *
 * **Canal `outro` é caminho de primeira classe**, não concessão: convite em
 * papel, entregue na mão, mandado pela cerimonialista — tudo isso é envio, e o
 * funil nunca exigiu jornada digital (docs/PRODUCT.md 5.1). É também o canal
 * que preserva o gesto do "Marcar como enviado" de antes.
 *
 * A data é sempre `now()` (default da coluna): quem registra está dizendo
 * "mandei agora", e aceitar uma data do client abriria a porta para um envio
 * datado no futuro entrar no funil como se já tivesse acontecido.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, comunicacaoRegistroSchema)

  const client = await serverSupabaseClient(event)

  // O convite tem que ser deste casamento e estar vivo. O trigger do banco
  // repete a checagem de casamento — aqui é para a mensagem de erro ser útil,
  // lá é para ser impossível.
  const { data: convite, error: conviteError } = await client
    .from('convites')
    .select('id')
    .eq('id', input.conviteId)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (conviteError) throw badRequestError(conviteError.message)
  if (!convite) throw notFoundError('Convite não encontrado.')

  const { data, error } = await client
    .from('comunicacoes')
    .insert({
      casamento_id: weddingId,
      convite_id: input.conviteId,
      convidado_id: input.convidadoId ?? null,
      canal: input.canal,
      tipo: input.tipo,
      registrado_por: memberId,
    })
    .select('id, tipo, canal, enviado_em')
    .single()

  if (error) throw badRequestError(error.message)

  // A Linha do Tempo do convite continua contando a história: o status
  // responde "onde este convite está agora", ela responde "o que aconteceu
  // para ele chegar aqui". Um envio é um acontecimento.
  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: input.conviteId,
    tipo_evento: 'comunicacao.enviada',
    metadados: { tipo: input.tipo, canal: input.canal, source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'communication.register',
    entityType: 'communication',
    entityId: data.id,
    // Sem telefone nem nome: dado pessoal não vai para log em texto pleno
    // (CLAUDE.md, seção 11). O que aconteceu e com qual convite bastam.
    metadata: { inviteId: input.conviteId, tipo: input.tipo, canal: input.canal },
  })

  return {
    id: data.id,
    tipo: data.tipo,
    canal: data.canal,
    enviadoEm: data.enviado_em,
    rotulo: ROTULOS_TIPO_COMUNICACAO[input.tipo],
  }
})
