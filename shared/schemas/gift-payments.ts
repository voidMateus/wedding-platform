import { z } from 'zod'

// Body de POST /api/public/gifts/[id]/checkout.post.ts — cria uma tentativa
// de pagamento online (CLAUDE.md, seção 18/28). A regra fina de qual campo é
// obrigatório depende de presentes.e_presente_cota/valor_cota_centavos, que
// este schema isolado não conhece — resolvida no handler, que já busca o
// presente. valorCentavos nunca é aceito para presente simples ou cota fixa
// (o handler sempre recalcula o valor no servidor nesses dois casos); só
// chega a ser usado aqui na contribuição de valor livre.
// nomePresenteador/telefonePresenteador — ver gift-mutations.ts#giftReserveSchema.
// Sem token de convite — o presente é público, `giftId` (na URL) já basta
// pra resolver o casamento.

export const giftCheckoutSchema = z
  .object({
    nomePresenteador: z.string().trim().min(1, 'Informe seu nome.').max(200),
    telefonePresenteador: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(500).optional().or(z.literal('')),
    valorCentavos: z.coerce
      .number({ message: 'Informe um valor válido.' })
      .int('O valor deve ser um número inteiro de centavos.')
      .min(1, 'Informe um valor maior que zero.')
      .optional(),
    quantidadeCotas: z.coerce.number().int().min(1, 'Informe ao menos 1 cota.').optional(),
  })
  .refine((value) => value.valorCentavos === undefined || value.quantidadeCotas === undefined, {
    message: 'Informe valor livre ou quantidade de cotas, nunca os dois.',
    path: ['valorCentavos'],
  })

export type GiftCheckoutInput = z.infer<typeof giftCheckoutSchema>

// Query de GET /api/public/gifts/payments/[id]/status.get.ts. nsuTransacao/
// slug são opcionais — só vêm preenchidos quando a InfinitePay os anexa na
// querystring do redirect de volta (CLAUDE.md, seção 18.4/28.3); sem eles, o
// payment_check reaproveita o que já estiver salvo em pagamentos_presentes.
// Sem token de convite — o próprio `paymentId` (UUID, gerado por nós e nunca
// listado publicamente) já funciona como credencial de acesso a este status.
export const giftPaymentStatusQuerySchema = z.object({
  nsuTransacao: z.string().trim().optional(),
  slug: z.string().trim().optional(),
})

export type GiftPaymentStatusQuery = z.infer<typeof giftPaymentStatusQuerySchema>
