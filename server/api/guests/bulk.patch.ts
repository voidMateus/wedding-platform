import { serverSupabaseClient } from '#supabase/server'
import { guestBulkUpdateSchema } from '#shared/schemas/guests'

/**
 * Ação em massa da lista de convidados: aplica o mesmo valor a vários.
 *
 * Endpoint próprio, e não um desvio pelo importador: o importador resolve
 * grupo por NOME (e, desde 20260908090002, só entre grupos de primeiro nível),
 * então mover gente para uma subdivisão por lá exigiria mandar o par
 * grupo+subdivisão de cada linha. Aqui o alvo é o id da folha, que é o que a
 * tela tem na mão. O registro de auditoria também fica correto — `guest.import`
 * descreveria uma ação que não aconteceu.
 *
 * `.in('id', ids)` mais o filtro de casamento é o que impede a lista de
 * alcançar convidado de outro casamento; a RLS é a última linha de defesa
 * (CLAUDE.md, seção 4.2).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestBulkUpdateSchema)

  // Só as chaves presentes entram no update: ausente é "não mexer", e um
  // `?? null` aqui apagaria o grupo de todo mundo numa mudança de categoria.
  const patch: Record<string, unknown> = {}
  if (input.grupoId !== undefined) patch.grupo_id = input.grupoId
  if (input.faixaEtariaManual !== undefined) patch.faixa_etaria_manual = input.faixaEtariaManual

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('convidados')
    .update(patch)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .in('id', input.ids)
    .select('id')

  if (error) {
    throw badRequestError(error.message)
  }

  // Sem nome de convidado nos metadados — dado pessoal não vai para log em
  // texto pleno (CLAUDE.md, seção 11). A contagem e o que mudou bastam.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.bulk_update',
    entityType: 'guest',
    entityId: weddingId,
    metadata: {
      total: (data ?? []).length,
      campos: Object.keys(patch),
    },
  })

  return { atualizados: (data ?? []).length }
})
