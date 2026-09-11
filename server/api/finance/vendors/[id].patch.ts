import { serverSupabaseClient } from '#supabase/server'
import { vendorPatchSchema } from '#shared/schemas/finance'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw badRequestError('Fornecedor não informado.')
  }

  const input = await validateBody(event, vendorPatchSchema)

  const atualizacao: Record<string, unknown> = {}
  if (input.nome !== undefined) atualizacao.nome = input.nome
  if (input.categoriaId !== undefined) atualizacao.categoria_id = input.categoriaId ?? null
  if (input.estagio !== undefined) atualizacao.estagio = input.estagio
  if (input.valorPropostoCentavos !== undefined) {
    atualizacao.valor_proposto_centavos = input.valorPropostoCentavos ?? null
  }
  if (input.nomeContato !== undefined) atualizacao.nome_contato = input.nomeContato ?? null
  if (input.telefone !== undefined) atualizacao.telefone = input.telefone ?? null
  if (input.email !== undefined) atualizacao.email = input.email || null
  if (input.siteUrl !== undefined) atualizacao.site_url = input.siteUrl || null
  if (input.observacao !== undefined) atualizacao.observacao = input.observacao ?? null

  if (Object.keys(atualizacao).length === 0) {
    throw badRequestError('Nada para atualizar.')
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('fornecedores')
    .update(atualizacao)
    .eq('id', id)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .select()
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }
  if (!data) {
    throw notFoundError('Fornecedor não encontrado.')
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.vendor.update',
    entityType: 'vendor',
    entityId: data.id,
  })

  return data
})
