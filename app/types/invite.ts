import type { Database } from './database.types'

export type Invite = Database['public']['Tables']['convites']['Row']
export type InviteTag = Database['public']['Tables']['etiquetas_convite']['Row']
export type InviteEvent = Database['public']['Tables']['historico_convite']['Row']

export type InviteResponseStatus = 'pending' | 'partial' | 'responded'

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
