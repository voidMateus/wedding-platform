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
  /**
   * Reexibição do link/QR já compartilhado. Nulo quando a credencial é
   * anterior à coluna `codigo_cifrado` ou a cifra não pôde ser aberta — o
   * token segue válido, só não é reexibível.
   */
  code: string | null
}
