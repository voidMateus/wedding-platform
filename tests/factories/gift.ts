import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type PresenteInsert = Database['public']['Tables']['presentes']['Insert']
type Presente = Database['public']['Tables']['presentes']['Row']

export async function createTestGift(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<PresenteInsert> = {},
): Promise<Presente> {
  const { data, error } = await admin
    .from('presentes')
    .insert({
      casamento_id: casamentoId,
      titulo: 'Presente de Teste',
      preco_centavos: 10000,
      quantidade_disponivel: 1,
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar presente de teste: ${error?.message}`)
  }
  return data
}
