import { serverSupabaseClient } from '#supabase/server'
import { vendorInputSchema } from '#shared/schemas/finance'

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, vendorInputSchema)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('fornecedores')
    .insert({
      casamento_id: weddingId,
      categoria_id: input.categoriaId ?? null,
      despesa_id: input.despesaId ?? null,
      nome: input.nome,
      estagio: input.estagio,
      valor_proposto_centavos: input.valorPropostoCentavos ?? null,
      nome_contato: input.nomeContato ?? null,
      telefone: input.telefone ?? null,
      email: input.email || null,
      site_url: input.siteUrl || null,
      observacao: input.observacao ?? null,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.vendor.create',
    entityType: 'vendor',
    entityId: data.id,
    metadata: { nome: data.nome },
  })

  setResponseStatus(event, 201)
  return data
})
