import { z } from 'zod'

// Compartilhado entre client (vitrine pública) e server (revalidação —
// CLAUDE.md, seção 8/20.1). A página de presentes é pública, sem token de
// convite (CLAUDE.md, seção 18.2/4.5) — nomePresenteador/telefonePresenteador,
// coletados num passo próprio antes da escolha da forma de presentear, são a
// única identificação de quem está presenteando.
//
// Contribuição em dinheiro passou a exigir pagamento online real — ver
// giftCheckoutSchema em gift-payments.ts. Reserva de presente físico
// continua podendo ser grátis (giftReserveSchema) ou paga (mesmo checkout).
// Não há mais cancelamento self-service (giftCancelSchema removido) — sem
// token, não há como provar posse com segurança; cancelamento é sempre
// resolvido falando direto com o casal.

export const giftReserveSchema = z.object({
  nomePresenteador: z.string().trim().min(1, 'Informe seu nome.').max(200),
  telefonePresenteador: z.string().trim().max(30).optional().or(z.literal('')),
  message: z.string().trim().max(500).optional().or(z.literal('')),
})

export type GiftReserveInput = z.infer<typeof giftReserveSchema>
