import { serverSupabaseClient } from '#supabase/server'
import { rsvpAdminStatusSchema } from '#shared/schemas/rsvp'

/**
 * O casal registra a resposta de um convidado que não usou o site.
 *
 * Até aqui `respostas_rsvp` era escrita em UM lugar só — dentro de
 * `salvar_rsvp_convidado`, chamada apenas pelo caminho do convidado. Ou seja: o
 * acompanhamento só funcionava para quem responde online, e a avó que confirma
 * por telefone ficava eternamente "pendente". É este endpoint que faz o funil
 * de status do convite valer para a lista inteira.
 *
 * Caminho de confiança ADMINISTRATIVO, não o do convidado (CLAUDE.md, seção
 * 4.2): aqui a autorização é o JWT + `casamento_id` resolvido de
 * `membros_casamento`, e a RLS é a última linha de defesa. Nunca reutiliza os
 * endpoints de `/api/rsvp/**`, que exigem a sessão `rsvp_session` emitida
 * depois da identificação do convidado — dois modelos diferentes para a mesma
 * tabela, cada um com o seu portão.
 *
 * A mesma função do Postgres grava as duas origens, com `p_origem` distinguindo
 * quem registrou: `admin_panel` aqui, `public_site` lá. O sistema nunca finge
 * que a avó acessou o site — a origem fica no histórico, e a Linha do Tempo
 * conta a diferença.
 *
 * NÃO checa `prazo_rsvp`, e isso é deliberado. O prazo é checado na camada de
 * API do caminho do convidado (`/api/rsvp/guests/[guestId]`), nunca dentro da
 * função — então esta assimetria é uma escolha, não um esquecimento: depois do
 * prazo é exatamente quando o casal está ligando para quem não respondeu, e
 * travar aqui deixaria essas respostas sem lugar para existir.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const guestId = getRouterParam(event, 'id')
  if (!guestId) {
    throw badRequestError('id do convidado não informado.')
  }

  const input = await validateBody(event, rsvpAdminStatusSchema)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client.rpc('salvar_rsvp_convidado', {
    p_casamento_id: weddingId,
    p_convidado_id: guestId,
    p_status: input.status,
    p_origem: 'admin_panel',
  })

  if (error) {
    if (error.message.includes('GUEST_NOT_FOUND')) {
      throw notFoundError('Convidado não encontrado.')
    }
    // RSVP é sempre por convidado e só existe dentro de um convite — sem
    // vínculo não há o que responder (CLAUDE.md, seção 12).
    if (error.message.includes('GUEST_WITHOUT_INVITE')) {
      throw conflictError(
        'Este convidado ainda não está em nenhum convite — vincule a um convite antes de registrar a resposta.',
      )
    }
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'rsvp.admin_set',
    entityType: 'guest',
    entityId: guestId,
    metadata: { status: input.status },
  })

  return data
})
