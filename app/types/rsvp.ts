export interface RsvpSearchResult {
  guestId: string
  fullName: string
}

export interface RsvpSelectResult {
  guestId: string
  maskedNames: string[]
}

export interface RsvpMember {
  guestId: string
  fullName: string
  nickname: string | null
  dietaryRestrictions: string | null
  status: 'pending' | 'confirmed' | 'declined' | 'waitlisted' | 'removed'
}

export interface RsvpInvitePayload {
  inviteId: string
  wedding: {
    coupleNames: string
    eventDate: string
    rsvpDeadline: string | null
    guestListMode: 'closed' | 'open'
  }
  isPastDeadline: boolean
  maxCompanions: number | null
  message: string | null
  members: RsvpMember[]
}
