import { z } from 'zod'

// Compartilhado entre client (wizard de convidado) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Mesmos campos para o convidado principal e cada
// acompanhante — só o convidado principal do wizard tem convite/grupoId
// resolvidos no fluxo, os demais herdam via sincronizar_nucleo_convidado.

export const guestPersonSchema = z.object({
  id: z.string().uuid().optional(),
  nomeCompleto: z.string().trim().min(1, 'Informe o nome.').max(200),
  apelido: z.string().trim().max(100).optional().or(z.literal('')),
  sexo: z.enum(['masculino', 'feminino', 'outro']).optional().or(z.literal('')),
  // <input type="date"> envia "yyyy-mm-dd" — Postgres aceita direto.
  dataNascimento: z.string().trim().optional().or(z.literal('')),
  caminhoFoto: z.string().trim().optional().or(z.literal('')),
  papelCasamento: z.enum(['padrinho', 'madrinha']).optional().or(z.literal('')),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
  grupoId: z.string().uuid().optional().or(z.literal('')),
})

export type GuestPersonInput = z.infer<typeof guestPersonSchema>

export const guestPartyInviteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, 'Informe um nome para o convite.').max(160),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
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
