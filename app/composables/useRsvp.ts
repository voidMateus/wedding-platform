import type { RsvpSubmitInput } from '#shared/schemas/rsvp'
import type { RsvpDetails } from '~/types/rsvp'

/**
 * Fluxo público de RSVP via código único (CLAUDE.md, seção 14.3/16). Sem
 * autenticação — toda chamada de rede do client passa por aqui (CLAUDE.md,
 * seção 5.1).
 */
export function useRsvp(code: string) {
  function getRsvp() {
    return useFetch<RsvpDetails>(`/api/rsvp/${code}`, { key: `rsvp-${code}` })
  }

  async function submitRsvp(input: RsvpSubmitInput) {
    return $fetch(`/api/rsvp/${code}`, { method: 'POST', body: input })
  }

  return { getRsvp, submitRsvp }
}
