/**
 * Classificação pura (sem H3) de qual grupo de rate limit uma rota do
 * caminho do convidado pertence (CLAUDE.md, seção 14.5/28) — extraída de
 * server/middleware/rate-limit.ts para ser testável sem mockar um H3 event.
 *
 * Achado real (auditoria de segurança): a busca pública por nome é servida
 * em `/api/public/{slug}/rsvp-search` (GET, com o slug do casamento no
 * meio do caminho — ver server/api/public/[slug]/rsvp-search.get.ts), não
 * em `/api/public/rsvp-search`. O regex anterior só cobria os passos
 * seguintes do fluxo (`/api/public/rsvp-search/select` e `/confirm`, sem
 * slug), deixando o endpoint de maior risco de enumeração sem nenhum
 * throttle.
 */
export type RateLimitPathKind = 'rsvp' | 'rsvp-search' | 'gift-mutation'

const GIFT_MUTATION_PATH = /^\/api\/public\/gifts\/[^/]+\/(reserve|checkout|cancel)$/
const GIFT_PAYMENT_STATUS_PATH = /^\/api\/public\/gifts\/payments\/[^/]+\/status$/
const RSVP_SEARCH_PATH = /^\/api\/public\/(?:[^/]+\/rsvp-search|rsvp-search\/(?:select|confirm))$/

export function classifyRateLimitPath(path: string): RateLimitPathKind | null {
  if (path.startsWith('/api/rsvp/')) return 'rsvp'
  if (RSVP_SEARCH_PATH.test(path)) return 'rsvp-search'
  if (GIFT_MUTATION_PATH.test(path) || GIFT_PAYMENT_STATUS_PATH.test(path)) return 'gift-mutation'
  return null
}
