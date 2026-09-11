import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = z.object({
  /** `?incluirArquivadas=1` traz também as arquivadas, para a tela de restauração. */
  incluirArquivadas: z.string().optional(),
})

/** Categorias do orçamento, na ordem de exibição. */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { incluirArquivadas } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)
  let query = client
    .from('categorias_orcamento')
    .select('*')
    .eq('casamento_id', weddingId)
    .order('ordem_exibicao', { ascending: true })

  if (!incluirArquivadas) {
    query = query.is('excluido_em', null)
  }

  const { data, error } = await query

  if (error) {
    throw badRequestError(error.message)
  }

  return { data }
})
