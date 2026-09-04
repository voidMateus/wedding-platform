import type { Database } from './database.types'

export type Invite = Database['public']['Tables']['convites']['Row']
export type InviteTag = Database['public']['Tables']['etiquetas_convite']['Row']
export type InviteEvent = Database['public']['Tables']['historico_convite']['Row']

export type InviteResponseStatus = 'pending' | 'partial' | 'responded'

/**
 * Valores de `historico_convite.tipo_evento` gravados hoje. A coluna é `text`
 * livre no Postgres (log append-only, sem CHECK), então esta união espelha os
 * pontos de escrita reais: `server/api/invites/index.post.ts`,
 * `.../[id]/archive.post.ts`, `.../[id]/send.post.ts`,
 * `server/api/guest-access-tokens/index.post.ts`,
 * `server/utils/rsvp-invite-payload.ts` e as funções `upsert_guest_rsvp()` /
 * `finalizar_rsvp_convite()`.
 *
 * Evento novo entra aqui primeiro: o mapa de rótulos da Linha do Tempo é um
 * `Record<InviteEventType, ...>`, então deixa de compilar até ganhar o texto
 * que o casal vai ler — foi assim que `token.sent` apareceu cru na tela.
 */
export type InviteEventType =
  | 'invite.created'
  | 'invite.archived'
  | 'invite.unarchived'
  | 'token.generated'
  | 'token.sent'
  | 'rsvp.first_access'
  | 'rsvp.guest_status_changed'
  | 'rsvp.message_sent'

export interface InviteListItem extends Invite {
  responsibleGuestName: string | null
  memberCount: number
  responseStatus: InviteResponseStatus
}

export interface InviteMember {
  id: string
  fullName: string
  nickname: string | null
  partyOrder: number
  isResponsible: boolean
  rsvpStatus: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'removido'
}

export interface InviteDetail extends Invite {
  responseStatus: InviteResponseStatus
  members: InviteMember[]
  tags: InviteTag[]
}
