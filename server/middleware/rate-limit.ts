/**
 * Rate limiting do caminho do convidado (CLAUDE.md, seção 14.5/28): cobre
 * /api/rsvp/**, a busca pública por nome (/api/public/rsvp-search**, mais
 * restritiva — maior risco de enumeração) e as mutações de presentes
 * (/api/public/gifts/[id]/{reserve,checkout,cancel} + consulta de status de
 * pagamento) — a leitura pública da vitrine (GET) não é limitada, mesma
 * decisão do CLAUDE.md/ARCHITECTURE.md para /api/gifts (leitura). O webhook
 * da InfinitePay (/api/public/gifts/payments/webhook) fica de fora — é
 * tráfego servidor-a-servidor, e a defesa real ali é a reverificação via
 * payment_check, não um limitador por IP (CLAUDE.md, seção 28).
 */
const GIFT_MUTATION_PATH = /^\/api\/public\/gifts\/[^/]+\/(reserve|checkout|cancel)$/
const GIFT_PAYMENT_STATUS_PATH = /^\/api\/public\/gifts\/payments\/[^/]+\/status$/
const RSVP_SEARCH_PATH = /^\/api\/public\/rsvp-search/

export default defineEventHandler(async (event) => {
  const isRsvpPath = event.path?.startsWith('/api/rsvp/') ?? false
  const isRsvpSearchPath = event.path ? RSVP_SEARCH_PATH.test(event.path) : false
  const isGiftMutationPath = event.path
    ? GIFT_MUTATION_PATH.test(event.path) || GIFT_PAYMENT_STATUS_PATH.test(event.path)
    : false

  if (!isRsvpPath && !isRsvpSearchPath && !isGiftMutationPath) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = isRsvpSearchPath
    ? await checkRsvpSearchRateLimit(ip)
    : isRsvpPath
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
