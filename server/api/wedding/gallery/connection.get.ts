import { serverSupabaseClient } from '#supabase/server'

// Colunas seguras: NUNCA retorna as de token (access/refresh cifrados) ao
// client — a tabela guarda segredo, mesma disciplina de gift_payments
// (CLAUDE.md, seção 28).
const SAFE_COLUMNS =
  'id, provider, mode, folder_id, folder_name, status, last_synced_at, last_sync_error, last_sync_photo_count, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('gallery_source_connections')
    .select(SAFE_COLUMNS)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return { connection: data ?? null }
})
