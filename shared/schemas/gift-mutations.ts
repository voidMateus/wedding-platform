import { z } from 'zod'

// Compartilhado entre client (vitrine pública) e server (revalidação —
// CLAUDE.md, seção 8/20.1). O código de acesso do convidado (mesmo do RSVP,
// CLAUDE.md seção 18.2) identifica quem está reservando/contribuindo/
// cancelando — nunca um guestId/groupId enviado livremente pelo client.

export const giftReserveSchema = z.object({
  code: z.string().trim().min(1, 'Código de acesso não informado.'),
})

export type GiftReserveInput = z.infer<typeof giftReserveSchema>

export const giftContributeSchema = z.object({
  code: z.string().trim().min(1, 'Código de acesso não informado.'),
  amountCents: z.coerce
    .number({ message: 'Informe um valor válido.' })
    .int('O valor deve ser um número inteiro de centavos.')
    .min(1, 'Informe um valor maior que zero.'),
})

export type GiftContributeInput = z.infer<typeof giftContributeSchema>

export const giftCancelSchema = z.object({
  code: z.string().trim().min(1, 'Código de acesso não informado.'),
})

export type GiftCancelInput = z.infer<typeof giftCancelSchema>
