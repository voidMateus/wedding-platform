import { z } from 'zod'

// Body de POST /api/public/gifts/[id]/checkout.post.ts — cria uma tentativa
// de pagamento online (CLAUDE.md, seção 18/28). A regra fina de qual campo é
// obrigatório depende de gifts.is_group_gift/quota_amount_cents, que este
// schema isolado não conhece — resolvida no handler, que já busca o gift.
// amountCents nunca é aceito para presente simples ou cota fixa (o handler
// sempre recalcula o valor no servidor nesses dois casos); só chega a ser
// usado aqui na contribuição de valor livre. giverName/giverPhone — ver
// gift-mutations.ts#giftReserveSchema. Sem token de convite — o presente é
// público, `giftId` (na URL) já basta pra resolver o wedding.

export const giftCheckoutSchema = z
  .object({
    giverName: z.string().trim().min(1, 'Informe seu nome.').max(200),
    giverPhone: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(500).optional().or(z.literal('')),
    amountCents: z.coerce
      .number({ message: 'Informe um valor válido.' })
      .int('O valor deve ser um número inteiro de centavos.')
      .min(1, 'Informe um valor maior que zero.')
      .optional(),
    quotaCount: z.coerce.number().int().min(1, 'Informe ao menos 1 cota.').optional(),
  })
  .refine((value) => value.amountCents === undefined || value.quotaCount === undefined, {
    message: 'Informe valor livre ou quantidade de cotas, nunca os dois.',
    path: ['amountCents'],
  })

export type GiftCheckoutInput = z.infer<typeof giftCheckoutSchema>

// Query de GET /api/public/gifts/payments/[id]/status.get.ts. transactionNsu/
// slug são opcionais — só vêm preenchidos quando a InfinitePay os anexa na
// querystring do redirect de volta (CLAUDE.md, seção 18.4/28.3); sem eles, o
// payment_check reaproveita o que já estiver salvo em gift_payments. Sem
// token de convite — o próprio `paymentId` (UUID, gerado por nós e nunca
// listado publicamente) já funciona como credencial de acesso a este status.
export const giftPaymentStatusQuerySchema = z.object({
  transactionNsu: z.string().trim().optional(),
  slug: z.string().trim().optional(),
})

export type GiftPaymentStatusQuery = z.infer<typeof giftPaymentStatusQuerySchema>
