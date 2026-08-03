import type { H3Event } from 'h3'

/**
 * Lê o segmento `[slug]` das rotas públicas (CLAUDE.md, seção 4.4/33) —
 * cada casamento tem sua própria URL (`/{slug}`, `/api/public/{slug}/**`).
 * Nunca lança silenciosamente: sem slug na rota é erro de programação, não
 * uma entrada de usuário ausente.
 */
export function getWeddingSlugParam(event: H3Event): string {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw badRequestError('slug do casamento não informado.')
  }
  return slug
}
