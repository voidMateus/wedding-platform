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
  status: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera' | 'removido'
}

export interface RsvpInvitePayload {
  inviteId: string
  wedding: {
    coupleNames: string
    eventDate: string
    rsvpDeadline: string | null
    guestListMode: 'fechada' | 'aberta'
  }
  isPastDeadline: boolean
  maxCompanions: number | null
  message: string | null
  members: RsvpMember[]
}
