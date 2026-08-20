/**
 * Rate limiting do caminho do convidado (CLAUDE.md, seção 14.5/28): cobre
 * /api/rsvp/**, a busca pública por nome (/api/public/{slug}/rsvp-search +
 * /api/public/rsvp-search/{select,confirm}, mais restritiva — maior risco
 * de enumeração) e as mutações de presentes
 * (/api/public/gifts/[id]/{reserve,checkout,cancel} + consulta de status de
 * pagamento) — a leitura pública da vitrine (GET) não é limitada, mesma
 * decisão do CLAUDE.md/ARCHITECTURE.md para /api/gifts (leitura). O webhook
 * da InfinitePay (/api/public/gifts/payments/webhook) fica de fora — é
 * tráfego servidor-a-servidor, e a defesa real ali é a reverificação via
 * payment_check, não um limitador por IP (CLAUDE.md, seção 28).
 *
 * A classificação de rota mora em server/utils/rate-limit-path.ts (função
 * pura, testada em isolamento) — este arquivo só resolve o IP e chama o
 * limitador correspondente.
 */
export default defineEventHandler(async (event) => {
  const kind = event.path ? classifyRateLimitPath(event.path) : null

  if (!kind) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result =
    kind === 'rsvp-search'
      ? await checkRsvpSearchRateLimit(ip)
      : kind === 'rsvp'
        ? await checkRsvpRateLimit(ip)
        : await checkGiftsRateLimit(ip)

  setResponseHeader(event, 'X-RateLimit-Limit', String(result.limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.success) {
    throw createError({
      statusCode: 429,
      message: 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
    })
  }
})
