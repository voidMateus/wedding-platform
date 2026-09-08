import { serverSupabaseClient } from '#supabase/server'

/**
 * Soft delete simples — diferente de invites, convidados.grupo_id é
 * ON DELETE SET NULL (etiqueta organizacional, não unidade de RSVP), então
 * excluir um grupo não exige realocação prévia nem confirmação de cascata:
 * os convidados só perdem a etiqueta.
 *
 * Subdivisões vão junto, pelo mesmo motivo de POST /archive: subdivisão ativa
 * sob pai arquivado é estado que nenhum outro caminho consegue produzir. Elas
 * recebem o mesmo timestamp do pai, que é o que permite desarquivar depois
 * exatamente o que a cascata levou (ver archive.post.ts).
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }

  const client = await serverSupabaseClient(event)
  const excluidoEm = new Date().toISOString()

  const { data, error } = await client
    .from('grupos')
    .update({ excluido_em: excluidoEm })
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select('id, nome')
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Grupo não encontrado.')
  }

  const { data: filhas, error: erroFilhas } = await client
    .from('grupos')
    .update({ excluido_em: excluidoEm })
    .eq('casamento_id', weddingId)
    .eq('grupo_pai_id', id)
    .is('excluido_em', null)
    .select('id')

  if (erroFilhas) {
    throw badRequestError(erroFilhas.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'group.delete',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.nome, subdivisionsAffected: (filhas ?? []).length },
  })

  return { id: data.id }
})
