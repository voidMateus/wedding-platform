import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type PagamentoPresenteInsert = Database['public']['Tables']['pagamentos_presentes']['Insert']
type PagamentoPresente = Database['public']['Tables']['pagamentos_presentes']['Row']

/**
 * `tipo: 'reserva'` exige `presentes.e_presente_cota = false` (trigger
 * `pagamentos_presentes_verificar_consistencia`) — por isso o default só
 * funciona contra um presente simples (o padrão de `createTestGift`). Para
 * um presente de cota, passe `overrides.tipo = 'contribuicao'` junto de um
 * `presenteId` de presente com `e_presente_cota = true`.
 */
export async function createTestGiftPayment(
  admin: AdminClient,
  casamentoId: string,
  presenteId: string,
  overrides: Partial<PagamentoPresenteInsert> = {},
): Promise<PagamentoPresente> {
  const { data, error } = await admin
    .from('pagamentos_presentes')
    .insert({
      casamento_id: casamentoId,
      presente_id: presenteId,
      nome_presenteador: 'Presenteador de Teste',
      nsu_pedido_provedor: `teste-integracao-${randomUUID()}`,
      tipo: 'reserva',
      valor_centavos: 5000,
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar pagamento de presente de teste: ${error?.message}`)
  }
  return data
}
