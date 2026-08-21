import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ComunicacaoInsert = Database['public']['Tables']['comunicacoes']['Insert']
type Comunicacao = Database['public']['Tables']['comunicacoes']['Row']

export async function createTestCommunication(
  admin: AdminClient,
  casamentoId: string,
  credencialId: string,
  overrides: Partial<ComunicacaoInsert> = {},
): Promise<Comunicacao> {
  const { data, error } = await admin
    .from('comunicacoes')
    .insert({
      casamento_id: casamentoId,
      credencial_id: credencialId,
      tipo: 'convite',
      canal: 'whatsapp',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar comunicação de teste: ${error?.message}`)
  }
  return data
}
