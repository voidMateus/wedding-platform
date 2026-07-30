import { z } from 'zod'

// Compartilhado entre client (painel admin) e server (revalidação — CLAUDE.md,
// seção 8/20.1). Exatamente um entre guestId/groupId, nunca os dois nem
// nenhum — mesma regra do CHECK guest_access_tokens_guest_xor_group
// (CLAUDE.md, seção 12.2).

export const guestAccessTokenGenerateSchema = z
  .object({
    guestId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
  })
  .refine((value) => Number(Boolean(value.guestId)) + Number(Boolean(value.groupId)) === 1, {
    message: 'Informe exatamente um entre guestId e groupId.',
  })

export type GuestAccessTokenGenerateInput = z.infer<typeof guestAccessTokenGenerateSchema>

export const guestAccessTokenStatusQuerySchema = z
  .object({
    guestId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
  })
  .refine((value) => Number(Boolean(value.guestId)) + Number(Boolean(value.groupId)) === 1, {
    message: 'Informe exatamente um entre guestId e groupId.',
  })

export type GuestAccessTokenStatusQuery = z.infer<typeof guestAccessTokenStatusQuerySchema>
