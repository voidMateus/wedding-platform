import type { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/database.types'

type SupabaseClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

/**
 * Resolve a URL pública de uma foto a partir do storage_path salvo em
 * `photos` (bucket `wedding-photos`, leitura pública — CLAUDE.md, seção 28).
 * Compartilhado entre os endpoints de listagem, upload e edição de metadados
 * (server/api/photos/**) para não recalcular a URL de formas diferentes.
 */
export function resolvePhotoUrl(client: SupabaseClient, storagePath: string): string {
  const { data } = client.storage.from('wedding-photos').getPublicUrl(storagePath)
  return data.publicUrl
}
