import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { TIPOS_DOCUMENTO } from '#shared/schemas/finance'

const querySchema = z.object({
  tipo: z.enum(TIPOS_DOCUMENTO).optional(),
  fornecedorId: z.string().uuid().optional(),
  despesaId: z.string().uuid().optional(),
})

/**
 * Documentos do casamento, opcionalmente recortados por tipo, fornecedor ou
 * despesa. É o mesmo endpoint que a tela central e as listas embutidas dentro
 * de um fornecedor/despesa consomem — entidade única, exibida filtrada.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const filtros = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  let query = client
    .from('documentos')
    .select('*, fornecedor:fornecedores (id, nome), despesa:despesas (id, descricao)')
    .eq('casamento_id', weddingId)
    .order('created_at', { ascending: false })

  if (filtros.tipo) query = query.eq('tipo', filtros.tipo)
  if (filtros.fornecedorId) query = query.eq('fornecedor_id', filtros.fornecedorId)
  if (filtros.despesaId) query = query.eq('despesa_id', filtros.despesaId)

  const { data, error } = await query

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
