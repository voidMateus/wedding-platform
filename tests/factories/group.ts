import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type GrupoInsert = Database['public']['Tables']['grupos']['Insert']
type Grupo = Database['public']['Tables']['grupos']['Row']

export async function createTestGroup(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<GrupoInsert> = {},
): Promise<Grupo> {
  const { data, error } = await admin
    .from('grupos')
    .insert({
      casamento_id: casamentoId,
      nome: 'Grupo de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar grupo de teste: ${error?.message}`)
  }
  return data
}
