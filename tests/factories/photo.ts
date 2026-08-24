import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type FotoInsert = Database['public']['Tables']['fotos']['Insert']
type Foto = Database['public']['Tables']['fotos']['Row']

export async function createTestPhoto(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<FotoInsert> = {},
): Promise<Foto> {
  const { data, error } = await admin
    .from('fotos')
    .insert({
      casamento_id: casamentoId,
      id_arquivo_origem: 'arquivo-teste-drive-id',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar foto de teste: ${error?.message}`)
  }
  return data
}
