import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ConvidadoInsert = Database['public']['Tables']['convidados']['Insert']
type Convidado = Database['public']['Tables']['convidados']['Row']

export async function createTestGuest(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<ConvidadoInsert> = {},
): Promise<Convidado> {
  const { data, error } = await admin
    .from('convidados')
    .insert({
      casamento_id: casamentoId,
      nome_completo: 'Convidado de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar convidado de teste: ${error?.message}`)
  }
  return data
}
