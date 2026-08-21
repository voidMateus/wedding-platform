import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
})

const SEARCH_RESULTS_PER_TYPE_LIMIT = 8

interface SearchResult {
  type: 'guest' | 'invite' | 'group'
  id: string
  label: string
  sublabel: string | null
  href: string
}

/**
 * Busca administrativa global (CLAUDE.md, seção 12.1) — reaproveita a
 * mesma função de correspondência tolerante da busca pública de RSVP
 * (buscar_convidados_por_nome), estendida a convite/grupo/responsável.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { q } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)

  const [guestsResult, invitesResult, groupsResult] = await Promise.all([
    client.rpc('buscar_convidados_por_nome', {
      p_casamento_id: weddingId,
      p_busca: q,
      p_limite: SEARCH_RESULTS_PER_TYPE_LIMIT,
    }),
    client
      .from('convites')
      .select('id, nome')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .ilike('nome', `%${q}%`)
      .limit(SEARCH_RESULTS_PER_TYPE_LIMIT),
    client
      .from('grupos')
      .select('id, nome')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .ilike('nome', `%${q}%`)
      .limit(SEARCH_RESULTS_PER_TYPE_LIMIT),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (invitesResult.error) throw badRequestError(invitesResult.error.message)
  if (groupsResult.error) throw badRequestError(groupsResult.error.message)

  const results: SearchResult[] = [
    ...(guestsResult.data ?? []).map((guest: { id: string; nome_completo: string }) => ({
      type: 'guest' as const,
      id: guest.id,
      label: guest.nome_completo,
      sublabel: 'Convidado',
      href: `/admin/convidados/${guest.id}`,
    })),
    ...(invitesResult.data ?? []).map((invite) => ({
      type: 'invite' as const,
      id: invite.id,
      label: invite.nome,
      sublabel: 'Convite',
      href: `/admin/convites/${invite.id}`,
    })),
    ...(groupsResult.data ?? []).map((group) => ({
      type: 'group' as const,
      id: group.id,
      label: group.nome,
      sublabel: 'Grupo',
      href: `/admin/convidados?groupId=${group.id}`,
    })),
  ]

  return { data: results }
})
