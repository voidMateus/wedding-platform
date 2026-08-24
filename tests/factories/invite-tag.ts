import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>
type EtiquetaConviteInsert = Database['public']['Tables']['etiquetas_convite']['Insert']
type EtiquetaConvite = Database['public']['Tables']['etiquetas_convite']['Row']
type VinculoConviteEtiquetaInsert = Database['public']['Tables']['vinculos_convite_etiqueta']['Insert']
type VinculoConviteEtiqueta = Database['public']['Tables']['vinculos_convite_etiqueta']['Row']

export async function createTestInviteTag(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<EtiquetaConviteInsert> = {},
): Promise<EtiquetaConvite> {
  const { data, error } = await admin
    .from('etiquetas_convite')
    .insert({
      casamento_id: casamentoId,
      nome: 'Etiqueta de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar etiqueta de teste: ${error?.message}`)
  }
  return data
}

/** `vinculos_convite_etiqueta` não tem `casamento_id` próprio (docs/DATABASE.md) — o vínculo é resolvido só por `convite_id`/`etiqueta_id`. */
export async function createTestInviteTagLink(
  admin: AdminClient,
  conviteId: string,
  etiquetaId: string,
  overrides: Partial<VinculoConviteEtiquetaInsert> = {},
): Promise<VinculoConviteEtiqueta> {
  const { data, error } = await admin
    .from('vinculos_convite_etiqueta')
    .insert({
      convite_id: conviteId,
      etiqueta_id: etiquetaId,
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar vínculo convite-etiqueta de teste: ${error?.message}`)
  }
  return data
}
