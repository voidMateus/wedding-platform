import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type EtapaEventoInsert = Database['public']['Tables']['etapas_evento']['Insert']
type EtapaEvento = Database['public']['Tables']['etapas_evento']['Row']

export async function createTestEventSegment(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<EtapaEventoInsert> = {},
): Promise<EtapaEvento> {
  const { data, error } = await admin
    .from('etapas_evento')
    .insert({
      casamento_id: casamentoId,
      titulo: 'Etapa de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar etapa de evento de teste: ${error?.message}`)
  }
  return data
}
