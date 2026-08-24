import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ReservaPresenteInsert = Database['public']['Tables']['reservas_presentes']['Insert']
type ReservaPresente = Database['public']['Tables']['reservas_presentes']['Row']

/**
 * `convidado_id`/`convite_id` são legado, sempre `null` em registros novos
 * pós-"Fase Presentes 2.0" (docs/DATABASE.md) — por isso o default usa
 * `nome_contribuinte` para satisfazer o CHECK `reservas_presentes_identified`
 * (precisa de ao menos um entre os três).
 */
export async function createTestGiftReservation(
  admin: AdminClient,
  casamentoId: string,
  presenteId: string,
  overrides: Partial<ReservaPresenteInsert> = {},
): Promise<ReservaPresente> {
  const { data, error } = await admin
    .from('reservas_presentes')
    .insert({
      casamento_id: casamentoId,
      presente_id: presenteId,
      nome_contribuinte: 'Presenteador de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar reserva de presente de teste: ${error?.message}`)
  }
  return data
}
