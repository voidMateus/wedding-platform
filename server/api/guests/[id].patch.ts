import { serverSupabaseClient } from '#supabase/server'
import { guestUpdateSchema } from '#shared/schemas/guests'

/**
 * Edita os campos simples de um convidado — o que a célula do Modo Lista grava
 * ao sair da linha.
 *
 * Endpoint próprio, e não um desvio por `PUT /api/guests/party`: aquele
 * descreve o wizard inteiro (principal + acompanhantes + convite) e passa por
 * `sincronizar_nucleo_convidado`, então mandar uma troca de nome por lá faria
 * a edição de uma célula reescrever a estrutura de núcleo e convite da pessoa.
 * Aqui o alcance é exatamente o que a lista oferece.
 *
 * Também não é o `bulk.patch.ts`: lá o mesmo valor vai para muita gente, o que
 * torna nome um campo impossível de aceitar. A auditoria também ficaria errada
 * — `guest.bulk_update` descreveria uma ação que não aconteceu.
 *
 * O filtro por `casamento_id` é o que impede a lista de alcançar convidado de
 * outro casamento; a RLS é a última linha de defesa (CLAUDE.md, seção 4.2).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do convidado não informado.')
  }

  const input = await validateBody(event, guestUpdateSchema)

  // Só as chaves presentes entram no update: ausente é "não mexer". Um `?? null`
  // aqui apagaria a observação de quem só trocou de grupo.
  const patch: Record<string, unknown> = {}
  if (input.nomeCompleto !== undefined) patch.nome_completo = input.nomeCompleto
  if (input.grupoId !== undefined) patch.grupo_id = input.grupoId
  if (input.faixaEtariaManual !== undefined) patch.faixa_etaria_manual = input.faixaEtariaManual
  // String vazia vira null: a célula devolve '' quando o casal apaga o texto, e
  // gravar a string vazia deixaria a coluna "preenchida com nada" — dois
  // estados indistinguíveis na leitura para uma informação só.
  if (input.observacoes !== undefined) patch.observacoes = input.observacoes || null

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('convidados')
    .update(patch)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Convidado não encontrado.')
  }

  // Sem nome de convidado nos metadados — dado pessoal não vai para log em
  // texto pleno (CLAUDE.md, seção 11). Quais campos mudaram bastam.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.update',
    entityType: 'guest',
    entityId: data.id,
    metadata: { campos: Object.keys(patch) },
  })

  return { id: data.id }
})
