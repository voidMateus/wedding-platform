export interface GuestAccessTokenGenerated {
  id: string
  code: string
  inviteId: string
  createdAt: string
}

export interface GuestAccessTokenStatus {
  active: boolean
  id: string | null
  createdAt: string | null
}
