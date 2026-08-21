import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type HistoricoConviteInsert = Database['public']['Tables']['historico_convite']['Insert']
type HistoricoConvite = Database['public']['Tables']['historico_convite']['Row']

export async function createTestInviteEvent(
  admin: AdminClient,
  casamentoId: string,
  conviteId: string,
  overrides: Partial<HistoricoConviteInsert> = {},
): Promise<HistoricoConvite> {
  const { data, error } = await admin
    .from('historico_convite')
    .insert({
      casamento_id: casamentoId,
      convite_id: conviteId,
      tipo_evento: 'invite.created',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar evento de histórico de teste: ${error?.message}`)
  }
  return data
}
