import { serverSupabaseClient } from '#supabase/server'
import { guestQuickCreateSchema } from '#shared/schemas/guests'

/**
 * Criação rápida de convidado — a entrada "digitar nome + Enter" do Modo Lista.
 *
 * Não passa por `sincronizar_nucleo_convidado()` de propósito. Aquela função
 * existe para orquestrar núcleo de acompanhantes e convite numa transação, e
 * nada disso está em jogo aqui: é uma linha nova em `convidados`, sem
 * acompanhante, sem convite e sem concorrência sobre limite nenhum — os casos
 * que exigem função Postgres (CLAUDE.md, seção 10). Um insert simples é
 * também o que mantém o Enter rápido, que é a razão de existir da tela.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestQuickCreateSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('convidados')
    .insert({
      casamento_id: weddingId,
      nome_completo: input.nomeCompleto,
      grupo_id: input.grupoId ?? null,
      em_consideracao: input.emConsideracao,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  // Sem o nome nos metadados: nome de convidado é dado pessoal e não vai para
  // log em texto pleno (CLAUDE.md, seção 11). O `entityId` já permite chegar
  // na linha quando a auditoria precisar.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.quick_create',
    entityType: 'guest',
    entityId: data.id,
    metadata: { emConsideracao: data.em_consideracao, comGrupo: Boolean(data.grupo_id) },
  })

  setResponseStatus(event, 201)
  return data
})
