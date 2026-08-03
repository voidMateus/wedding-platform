import { z } from 'zod'

// Compartilhado entre client (wizard de convidado) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Mesmos campos para o convidado principal e cada
// acompanhante — só o convidado principal do wizard tem invite/groupId
// resolvidos no fluxo, os demais herdam via sync_guest_party.

export const guestPersonSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(1, 'Informe o nome.').max(200),
  nickname: z.string().trim().max(100).optional().or(z.literal('')),
  sex: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  // <input type="date"> envia "yyyy-mm-dd" — Postgres aceita direto.
  birthDate: z.string().trim().optional().or(z.literal('')),
  photoPath: z.string().trim().optional().or(z.literal('')),
  weddingRole: z.enum(['padrinho', 'madrinha']).optional().or(z.literal('')),
  dietaryRestrictions: z.string().trim().max(500).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  groupId: z.string().uuid().optional().or(z.literal('')),
})

export type GuestPersonInput = z.infer<typeof guestPersonSchema>

export const guestPartyInviteSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Informe um nome para o convite.').max(160),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const guestPartySyncSchema = z.object({
  primary: guestPersonSchema,
  companions: z.array(guestPersonSchema).default([]),
  removedGuestIds: z.array(z.string().uuid()).default([]),
  invite: guestPartyInviteSchema.optional(),
})

export type GuestPartySyncInput = z.infer<typeof guestPartySyncSchema>

export const guestPartyReorderSchema = z.object({
  partyId: z.string().uuid(),
  orderedGuestIds: z.array(z.string().uuid()).min(1),
})

export type GuestPartyReorderInput = z.infer<typeof guestPartyReorderSchema>
