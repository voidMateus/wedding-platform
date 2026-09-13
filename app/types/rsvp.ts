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
  status: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera'
  /**
   * Núcleo de Acompanhantes a que a pessoa pertence, ou null. Serve só para a
   * tela agrupar os cartões — os membros já chegam com cada núcleo junto
   * (`ordenarMembrosDoConvite`), então basta juntar os consecutivos.
   *
   * Em inglês como o resto deste DTO: ele não espelha uma linha de tabela 1:1
   * (CLAUDE.md, seção 6).
   */
  partyId: string | null
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
