import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
})

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
 * (search_guests_by_name), estendida a convite/grupo/responsável.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const { q } = validateQuery(event, querySchema)

  const client = await serverSupabaseClient(event)

  const [guestsResult, invitesResult, groupsResult] = await Promise.all([
    client.rpc('search_guests_by_name', { p_wedding_id: weddingId, p_query: q, p_limit: 8 }),
    client.from('invites').select('id, name').eq('wedding_id', weddingId).is('deleted_at', null).ilike('name', `%${q}%`).limit(8),
    client.from('groups').select('id, name').eq('wedding_id', weddingId).is('deleted_at', null).ilike('name', `%${q}%`).limit(8),
  ])

  if (guestsResult.error) throw badRequestError(guestsResult.error.message)
  if (invitesResult.error) throw badRequestError(invitesResult.error.message)
  if (groupsResult.error) throw badRequestError(groupsResult.error.message)

  const results: SearchResult[] = [
    ...(guestsResult.data ?? []).map((guest: { id: string; full_name: string }) => ({
      type: 'guest' as const,
      id: guest.id,
      label: guest.full_name,
      sublabel: 'Convidado',
      href: `/admin/convidados/${guest.id}`,
    })),
    ...(invitesResult.data ?? []).map((invite) => ({
      type: 'invite' as const,
      id: invite.id,
      label: invite.name,
      sublabel: 'Convite',
      href: `/admin/convites/${invite.id}`,
    })),
    ...(groupsResult.data ?? []).map((group) => ({
      type: 'group' as const,
      id: group.id,
      label: group.name,
      sublabel: 'Grupo',
      href: `/admin/convidados?groupId=${group.id}`,
    })),
  ]

  return { data: results }
})
