export interface RsvpCompanion {
  fullName: string
  dietaryRestrictions: string | null
}

export interface RsvpResponseData {
  status: 'pending' | 'confirmed' | 'declined'
  dietaryNotes: string | null
  message: string | null
  companions: RsvpCompanion[]
}

export interface RsvpDetails {
  wedding: {
    coupleNames: string
    eventDate: string
    rsvpMode: 'per_group' | 'per_guest'
    rsvpDeadline: string | null
  }
  guestId: string | null
  groupId: string | null
  displayName: string
  maxMembers: number
  isPastDeadline: boolean
  response: RsvpResponseData | null
}
