import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type CategoriaPresenteInsert = Database['public']['Tables']['categorias_presentes']['Insert']
type CategoriaPresente = Database['public']['Tables']['categorias_presentes']['Row']

export async function createTestGiftCategory(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<CategoriaPresenteInsert> = {},
): Promise<CategoriaPresente> {
  const { data, error } = await admin
    .from('categorias_presentes')
    .insert({
      casamento_id: casamentoId,
      nome: 'Categoria de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar categoria de presente de teste: ${error?.message}`)
  }
  return data
}
