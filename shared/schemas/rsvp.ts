import { z } from 'zod'

// Compartilhado entre client (fluxo público de RSVP) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Busca por nome + confirmação leve substitui o
// código como caminho principal (CLAUDE.md, seção 12.1) — o link/QR direto
// (/rsvp/[code]) continua existindo como atalho.

export const RSVP_SEARCH_MIN_CHARS = 3

export const rsvpSearchQuerySchema = z.object({
  q: z.string().trim().min(RSVP_SEARCH_MIN_CHARS, 'Digite ao menos 3 letras.').max(100),
})

export const rsvpSelectSchema = z.object({
  guestId: z.string().uuid(),
})

export const rsvpConfirmSchema = z.object({
  guestId: z.string().uuid(),
})

export const rsvpGuestStatusSchema = z.object({
  status: z.enum(['confirmado', 'recusado'], { message: 'Selecione se você vai comparecer.' }),
  restricoesAlimentares: z.string().trim().max(500).optional().or(z.literal('')),
})

export type RsvpGuestStatusInput = z.infer<typeof rsvpGuestStatusSchema>

export const rsvpCompanionSchema = z.object({
  nomeCompleto: z.string().trim().min(1, 'Informe o nome do acompanhante.').max(200),
  restricoesAlimentares: z.string().trim().max(500).optional().or(z.literal('')),
})

export const rsvpFinalizeSchema = z.object({
  companions: z.array(rsvpCompanionSchema).max(50).optional().default([]),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type RsvpFinalizeInput = z.infer<typeof rsvpFinalizeSchema>
