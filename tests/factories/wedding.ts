import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type CasamentoInsert = Database['public']['Tables']['casamentos']['Insert']
type Casamento = Database['public']['Tables']['casamentos']['Row']

/**
 * Fábrica de casamento para testes de integração (docs/ARCHITECTURE.md,
 * seção 9.4) — nunca reaproveita `supabase/seed.sql` (dado de dev manual,
 * não determinístico o suficiente para teste automatizado). Slug com
 * prefixo reconhecível para nunca ser confundido com dado real, mesmo se um
 * `afterAll` falhar por algum motivo.
 */
export async function createTestWedding(
  admin: AdminClient,
  overrides: Partial<CasamentoInsert> = {},
): Promise<Casamento> {
  const id = randomUUID()
  const { data, error } = await admin
    .from('casamentos')
    .insert({
      id,
      slug: `teste-integracao-${id}`,
      nomes_noivos: 'Teste & Integração',
      data_evento: '2030-01-01',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar casamento de teste: ${error?.message}`)
  }
  return data
}

/** Cascata (`on delete cascade`) cuida de convites/convidados/presentes/membros_casamento etc. */
export async function deleteTestWedding(admin: AdminClient, casamentoId: string): Promise<void> {
  await admin.from('casamentos').delete().eq('id', casamentoId)
}
