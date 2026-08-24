import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ConexaoGaleriaInsert = Database['public']['Tables']['conexoes_galeria']['Insert']
type ConexaoGaleria = Database['public']['Tables']['conexoes_galeria']['Row']

/**
 * `modo: 'public_link'` de propósito — evita ter que gerar um token cifrado
 * plausível só para o teste (constraint `gallery_source_connections_oauth_has_refresh`
 * exige refresh token só no modo `oauth`).
 */
export async function createTestGalleryConnection(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<ConexaoGaleriaInsert> = {},
): Promise<ConexaoGaleria> {
  const { data, error } = await admin
    .from('conexoes_galeria')
    .insert({
      casamento_id: casamentoId,
      provedor: 'google_drive',
      modo: 'public_link',
      id_pasta: 'pasta-teste-integracao',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar conexão de galeria de teste: ${error?.message}`)
  }
  return data
}
