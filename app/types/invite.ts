import type { Database } from './database.types'

export type Invite = Database['public']['Tables']['invites']['Row']
export type InviteTag = Database['public']['Tables']['invite_tags']['Row']
export type InviteEvent = Database['public']['Tables']['invite_events']['Row']

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
  rsvpStatus: 'pending' | 'confirmed' | 'declined' | 'waitlisted' | 'removed'
}

export interface InviteDetail extends Invite {
  responseStatus: InviteResponseStatus
  members: InviteMember[]
  tags: InviteTag[]
}
