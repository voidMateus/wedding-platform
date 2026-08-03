import { z } from 'zod'

// Compartilhado entre client (painel de Convites) e server (revalidação —
// CLAUDE.md, seção 8/20.1).

export const inviteInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para o convite.').max(160),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  responsibleGuestId: z.string().uuid().optional().or(z.literal('')),
  maxCompanions: z.coerce.number().int().min(0).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export type InviteInput = z.infer<typeof inviteInputSchema>

export const inviteAddGuestsSchema = z.object({
  guestIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um convidado.'),
})

export type InviteAddGuestsInput = z.infer<typeof inviteAddGuestsSchema>

export const inviteTagInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para a etiqueta.').max(60),
})

export type InviteTagInput = z.infer<typeof inviteTagInputSchema>
