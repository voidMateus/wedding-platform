import { rsvpSearchQuerySchema } from '#shared/schemas/rsvp'

/**
 * Busca tolerante por nome (CLAUDE.md, seção 12.1) — primeiro passo do RSVP
 * público sem código. Retorna só {guestId, fullName}: nunca convite,
 * acompanhantes ou status — a autorização deste caminho é inteiramente
 * responsabilidade deste handler, não de RLS (CLAUDE.md, seção 4.5/14.5),
 * por isso o mínimo possível é exposto por chamada. Convidados sem convite
 * ainda (invite_id null) não aparecem — não têm o que confirmar.
 */
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)
  const { q } = validateQuery(event, rsvpSearchQuerySchema)

  const client = supabaseAdmin(event)

  const { data: wedding, error: weddingError } = await client
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .single()

  if (weddingError || !wedding) {
    throw notFoundError('Casamento não encontrado.')
  }

  const { data, error } = await client.rpc('search_guests_by_name', {
    p_wedding_id: wedding.id,
    p_query: q,
    p_limit: 20,
  })

  if (error) {
    throw badRequestError(error.message)
  }

  type SearchRow = { id: string; full_name: string; nickname: string | null }
  const rows = (data ?? []) as SearchRow[]

  const guestIds = rows.map((guest) => guest.id)
  const { data: invited, error: invitedError } = guestIds.length
    ? await client.from('guests').select('id').in('id', guestIds).not('invite_id', 'is', null)
    : { data: [], error: null }

  if (invitedError) {
    throw badRequestError(invitedError.message)
  }

  const invitedIds = new Set((invited ?? []).map((g) => g.id))

  return {
    data: rows
      .filter((guest) => invitedIds.has(guest.id))
      .slice(0, 8)
      .map((guest) => ({ guestId: guest.id, fullName: guest.full_name })),
  }
})
