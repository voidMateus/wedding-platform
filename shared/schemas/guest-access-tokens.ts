import { z } from 'zod'

// Compartilhado entre client (painel admin) e server (revalidação —
// CLAUDE.md, seção 8/20.1). O link/QR sempre resolve o convite inteiro
// (invite_id) — CLAUDE.md, seção 14.5.

export const guestAccessTokenGenerateSchema = z.object({
  inviteId: z.string().uuid('Informe o convite.'),
})

export type GuestAccessTokenGenerateInput = z.infer<typeof guestAccessTokenGenerateSchema>

export const guestAccessTokenStatusQuerySchema = z.object({
  inviteId: z.string().uuid('Informe o convite.'),
})

export type GuestAccessTokenStatusQuery = z.infer<typeof guestAccessTokenStatusQuerySchema>
