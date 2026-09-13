import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ComunicacaoInsert = Database['public']['Tables']['comunicacoes']['Insert']
type Comunicacao = Database['public']['Tables']['comunicacoes']['Row']

/**
 * Um registro de envio.
 *
 * Pendurado no CONVITE, não na credencial: comunicação é do convite (a unidade
 * de comunicação), e um envio de canal `outro` — convite entregue em mãos — não
 * tem credencial nenhuma. A assinatura mudou junto com a tabela na Fase 2 do
 * Hub (migration 20260913100001).
 */
export async function createTestCommunication(
  admin: AdminClient,
  casamentoId: string,
  conviteId: string,
  overrides: Partial<ComunicacaoInsert> = {},
): Promise<Comunicacao> {
  const { data, error } = await admin
    .from('comunicacoes')
    .insert({
      casamento_id: casamentoId,
      convite_id: conviteId,
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
