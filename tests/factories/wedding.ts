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
      // PUBLICADO por padrão, embora a coluna nasça em 'rascunho'.
      //
      // Desde que o rascunho passou a barrar o site público
      // (docs/fase4-onboarding.md seção 8), um casamento de teste em rascunho
      // devolve 404 em toda rota pública e de convidado — e praticamente todo
      // teste descreve o cenário oposto: um convidado que recebeu o link de um
      // site no ar. Quem quer testar o PORTÃO pede `status_ciclo_vida:
      // 'rascunho'` explicitamente, e aí o teste diz o que está exercitando.
      status_ciclo_vida: 'publicado',
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
  const { error } = await admin.from('casamentos').delete().eq('id', casamentoId)
  if (error) {
    throw new Error(`Falha ao excluir casamento de teste ${casamentoId}: ${error.message}`)
  }
}
