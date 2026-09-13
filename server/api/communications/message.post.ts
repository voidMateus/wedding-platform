import { serverSupabaseClient } from '#supabase/server'
import { comunicacaoMensagemSchema } from '#shared/schemas/comunicacoes'
import { montarLinkWhatsApp } from '#shared/utils/telefone'
import type { MensagemPronta } from '~/types/comunicacao'

/**
 * A mensagem pronta de um convite: texto com as variáveis resolvidas, link do
 * convite e o `wa.me` do responsável.
 *
 * **POST, e não GET, porque ESCREVE**: gera a credencial de acesso quando o
 * convite ainda não tem uma. O link é o ponto do envio — mandar o casal passar
 * antes pela tela do convite para "gerar o link" seria um pedágio inútil no
 * meio de uma tarefa que se repete oitenta vezes. Rota que escreve não é
 * leitura, por mais que pareça.
 *
 * A montagem em si vive em `server/utils/mensagem-do-convite.ts`, porque o
 * envio por e-mail e o cron de lembretes precisam exatamente dela.
 */
export default defineEventHandler(async (event): Promise<MensagemPronta> => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, comunicacaoMensagemSchema)

  const client = await serverSupabaseClient(event)

  const mensagem = await montarMensagemDoConvite({
    client,
    weddingId,
    conviteId: input.conviteId,
    tipo: input.tipo,
    origin: getRequestURL(event).origin,
    // A geração entra na auditoria como qualquer outra: `origem` distingue o
    // link nascido aqui do gerado à mão na tela do convite.
    aoGerarCredencial: async (credencialId) => {
      await recordAuditLog(event, weddingId, memberId, {
        action: 'guest_access_token.generate',
        entityType: 'guest_access_token',
        entityId: credencialId,
        metadata: { inviteId: input.conviteId, origem: 'communications' },
      })
    },
  })

  return {
    conviteId: input.conviteId,
    tipo: input.tipo,
    texto: mensagem.texto,
    link: mensagem.link,
    telefoneE164: mensagem.destinatario?.telefoneE164 ?? null,
    email: mensagem.destinatario?.email ?? null,
    linkWhatsApp: montarLinkWhatsApp(mensagem.destinatario?.telefoneE164, mensagem.texto),
  }
})
