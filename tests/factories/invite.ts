import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ConviteInsert = Database['public']['Tables']['convites']['Insert']
type Convite = Database['public']['Tables']['convites']['Row']

export async function createTestInvite(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<ConviteInsert> = {},
): Promise<Convite> {
  const { data, error } = await admin
    .from('convites')
    .insert({
      casamento_id: casamentoId,
      nome: 'Família Teste',
      codigo_interno: `TESTE-${randomUUID().slice(0, 8).toUpperCase()}`,
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar convite de teste: ${error?.message}`)
  }
  return data
}
