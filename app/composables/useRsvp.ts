import type { RsvpFinalizeInput, RsvpGuestStatusInput } from '#shared/schemas/rsvp'
import type { RsvpInvitePayload, RsvpSearchResult, RsvpSelectResult } from '~/types/rsvp'

/**
 * Fluxo público de RSVP (CLAUDE.md, seção 12.1/16) — busca por nome +
 * confirmação leve como caminho principal, link/QR direto como atalho. Sem
 * autenticação — toda chamada de rede do client passa por aqui (CLAUDE.md,
 * seção 5.1).
 */
export function useRsvp() {
  async function searchGuests(q: string) {
    return $fetch<{ data: RsvpSearchResult[] }>('/api/public/rsvp-search', { query: { q } })
  }

  async function selectGuest(guestId: string) {
    return $fetch<RsvpSelectResult>('/api/public/rsvp-search/select', {
      method: 'POST',
      body: { guestId },
    })
  }

  async function confirmGuest(guestId: string) {
    return $fetch<RsvpInvitePayload>('/api/public/rsvp-search/confirm', {
      method: 'POST',
      body: { guestId },
    })
  }

  async function getRsvpByCode(code: string) {
    return $fetch<RsvpInvitePayload>(`/api/rsvp/${code}`)
  }

  async function autosaveGuestStatus(guestId: string, input: RsvpGuestStatusInput) {
    return $fetch(`/api/rsvp/guests/${guestId}`, { method: 'PUT', body: input })
  }

  async function finalizeInvite(inviteId: string, input: RsvpFinalizeInput) {
    return $fetch(`/api/rsvp/invites/${inviteId}/finalize`, { method: 'POST', body: input })
  }

  return { searchGuests, selectGuest, confirmGuest, getRsvpByCode, autosaveGuestStatus, finalizeInvite }
}
