import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

/**
 * Desfazer a aplicação do cronograma padrão.
 *
 * É o par de `seed.post.ts`, e existe porque foi o desfazer que tornou
 * aceitável criar cinquenta linhas de uma vez: sem caminho de volta, o botão
 * seria uma porta de mão única no meio de uma tela de planejamento.
 *
 * **Por ids, nunca por `origem_catalogo`.** Apagar "tudo que veio do catálogo"
 * levaria junto as sugestões que o casal tinha aceitado uma a uma antes de
 * aplicar o modelo — trabalho dele, não desta chamada.
 *
 * Tarefa já concluída fica: entre aplicar e desfazer cabe um clique numa
 * caixinha, e apagar o que alguém acabou de marcar como feito é apagar
 * trabalho declarado.
 */
const corpoSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Informe o que desfazer.').max(200),
})

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const { ids } = await validateBody(event, corpoSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('tarefas')
    .delete()
    .eq('casamento_id', weddingId)
    .is('concluida_em', null)
    .not('origem_catalogo', 'is', null)
    .in('id', ids)
    .select('id')

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'planning.template.undo',
    entityType: 'task',
    entityId: weddingId,
    metadata: { removidas: data?.length ?? 0 },
  })

  return { removidas: data?.length ?? 0 }
})
