import { serverSupabaseClient } from '#supabase/server'
import { groupInputSchema } from '#shared/schemas/groups'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('id do grupo não informado.')
  }
  const input = await validateBody(event, groupInputSchema)

  const client = await serverSupabaseClient(event)

  // `grupoPaiId` ausente não entra no update: o formulário de renomear grupo
  // não manda o campo, e um `?? null` aqui promoveria a grupo raiz toda
  // subdivisão que fosse só renomeada. `null` explícito continua chegando e é
  // justamente o que desvincula do pai.
  const patch: Record<string, unknown> = {
    nome: input.nome,
    cor: input.cor ?? null,
  }
  if (input.grupoPaiId !== undefined) {
    patch.grupo_pai_id = input.grupoPaiId
  }

  const { data, error } = await client
    .from('grupos')
    .update(patch)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(traduzirErroHierarquiaGrupo(error.message) ?? error.message)
  }
  if (!data) {
    throw notFoundError('Grupo não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'group.update',
    entityType: 'group',
    entityId: data.id,
    metadata: { name: data.nome, parentId: data.grupo_pai_id },
  })

  return data
})
