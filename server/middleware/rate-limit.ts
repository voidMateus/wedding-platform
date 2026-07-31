/**
 * Rate limiting do caminho do convidado (CLAUDE.md, seção 14.5/28): cobre
 * /api/rsvp/** e as mutações de presentes (/api/public/gifts/[id]/{reserve,
 * contribute,cancel}) — a leitura pública da vitrine (GET) não é limitada,
 * mesma decisão do CLAUDE.md/ARCHITECTURE.md para /api/gifts (leitura).
 *
 * Identificador é o IP da requisição — este caminho não tem sessão nem
 * usuário autenticado para usar como chave (CLAUDE.md, seção 4.5).
 */
const GIFT_MUTATION_PATH = /^\/api\/public\/gifts\/[^/]+\/(reserve|contribute|cancel)$/

export default defineEventHandler(async (event) => {
  const isRsvpPath = event.path?.startsWith('/api/rsvp/') ?? false
  const isGiftMutationPath = event.path ? GIFT_MUTATION_PATH.test(event.path) : false

  if (!isRsvpPath && !isGiftMutationPath) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = isRsvpPath ? await checkRsvpRateLimit(ip) : await checkGiftsRateLimit(ip)

  setResponseHeader(event, 'X-RateLimit-Limit', String(result.limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.success) {
    throw createError({
      statusCode: 429,
      message: 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
    })
  }
})
