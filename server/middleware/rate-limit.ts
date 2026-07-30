/**
 * Rate limiting do caminho do convidado (CLAUDE.md, seção 14.5/28) — hoje
 * cobre /api/rsvp/**; endpoints de presentes (/api/gifts/[id]/reserve etc.)
 * entram aqui quando forem implementados.
 *
 * Identificador é o IP da requisição — este endpoint não tem sessão nem
 * usuário autenticado para usar como chave (CLAUDE.md, seção 4.5).
 */
export default defineEventHandler(async (event) => {
  if (!event.path?.startsWith('/api/rsvp/')) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const result = await checkRsvpRateLimit(ip)

  setResponseHeader(event, 'X-RateLimit-Limit', String(result.limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.success) {
    throw createError({
      statusCode: 429,
      message: 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
    })
  }
})
