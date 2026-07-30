export interface GuestAccessTokenGenerated {
  id: string
  code: string
  guestId: string | null
  groupId: string | null
  createdAt: string
}

export interface GuestAccessTokenStatus {
  active: boolean
  id: string | null
  createdAt: string | null
}
