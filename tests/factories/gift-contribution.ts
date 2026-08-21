import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type ContribuicaoPresenteInsert = Database['public']['Tables']['contribuicoes_presentes']['Insert']
type ContribuicaoPresente = Database['public']['Tables']['contribuicoes_presentes']['Row']

/**
 * `convidado_id`/`convite_id` são legado, sempre `null` em registros novos
 * pós-"Fase Presentes 2.0" (docs/DATABASE.md) — por isso o default usa
 * `nome_contribuinte` para satisfazer o CHECK
 * `contribuicoes_presentes_identified` (precisa de ao menos um entre os
 * três).
 */
export async function createTestGiftContribution(
  admin: AdminClient,
  casamentoId: string,
  presenteId: string,
  overrides: Partial<ContribuicaoPresenteInsert> = {},
): Promise<ContribuicaoPresente> {
  const { data, error } = await admin
    .from('contribuicoes_presentes')
    .insert({
      casamento_id: casamentoId,
      presente_id: presenteId,
      nome_contribuinte: 'Contribuinte de Teste',
      valor_centavos: 5000,
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar contribuição de presente de teste: ${error?.message}`)
  }
  return data
}
