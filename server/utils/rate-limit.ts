import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting com store durável e compartilhado (Upstash Redis — CLAUDE.md,
 * seção 3/14.5/28). Contador em memória de processo não protege nada em
 * ambiente serverless multi-instância — por isso Redis, não um Map local.
 *
 * Um Ratelimit (com seu próprio prefix/orçamento) por grupo de endpoints do
 * caminho do convidado — RSVP e presentes não compartilham cota entre si,
 * para que uma varredura de um não consuma o orçamento legítimo do outro.
 * O client Redis subjacente é compartilhado (mesma conexão), montado uma
 * vez por processo (lazy), não a cada requisição.
 */
let redisClient: Redis | null = null

function getRedisClient(): Redis {
  if (!redisClient) {
    const config = useRuntimeConfig()
    redisClient = new Redis({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken,
    })
  }
  return redisClient
}

// Generoso o bastante para um convidado reabrir/editar algumas vezes
// seguidas, restritivo o bastante para não permitir varredura automatizada
// do endpoint (CLAUDE.md, seção 14.5).
const GUEST_PATH_LIMIT = 20
const GUEST_PATH_WINDOW = '60 s' as const

let rsvpRatelimit: Ratelimit | null = null

function getRsvpRatelimit(): Ratelimit {
  if (!rsvpRatelimit) {
    rsvpRatelimit = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(GUEST_PATH_LIMIT, GUEST_PATH_WINDOW),
      prefix: 'ratelimit:rsvp',
    })
  }
  return rsvpRatelimit
}

// Mais restritivo que o limite geral do caminho do convidado: a busca por
// nome (CLAUDE.md, seção 12.1) é o ponto de maior risco de enumeração do
// fluxo sem código — nenhum dado sensível vaza por chamada (só nomes já
// buscados), mas o volume de tentativas precisa ser mais apertado.
const RSVP_SEARCH_LIMIT = 10
const RSVP_SEARCH_WINDOW = '60 s' as const

let rsvpSearchRatelimit: Ratelimit | null = null

function getRsvpSearchRatelimit(): Ratelimit {
  if (!rsvpSearchRatelimit) {
    rsvpSearchRatelimit = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(RSVP_SEARCH_LIMIT, RSVP_SEARCH_WINDOW),
      prefix: 'ratelimit:rsvp-search',
    })
  }
  return rsvpSearchRatelimit
}

let giftsRatelimit: Ratelimit | null = null

function getGiftsRatelimit(): Ratelimit {
  if (!giftsRatelimit) {
    giftsRatelimit = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(GUEST_PATH_LIMIT, GUEST_PATH_WINDOW),
      prefix: 'ratelimit:gifts',
    })
  }
  return giftsRatelimit
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function checkRsvpRateLimit(identifier: string): Promise<RateLimitResult> {
  return getRsvpRatelimit().limit(identifier)
}

export async function checkRsvpSearchRateLimit(identifier: string): Promise<RateLimitResult> {
  return getRsvpSearchRatelimit().limit(identifier)
}

export async function checkGiftsRateLimit(identifier: string): Promise<RateLimitResult> {
  return getGiftsRatelimit().limit(identifier)
}

// Busca de lugares (/api/places/**). Diferente dos grupos acima, este é um
// endpoint do caminho administrativo — atrás de sessão autenticada, não
// exposto a visitante. O limite existe por outro motivo: cada chamada custa
// dinheiro no provedor externo (Places API), e o autocomplete dispara a cada
// pausa de digitação. Uma sessão presa num loop de re-render, ou um membro
// curioso segurando uma tecla, queimaria a cota mensal do projeto inteiro
// sem nenhum sinal. Chaveado pelo membro autenticado, não pelo IP: o casal
// dividindo a mesma rede não deve consumir a cota um do outro.
const PLACES_LIMIT = 60
const PLACES_WINDOW = '60 s' as const

let placesRatelimit: Ratelimit | null = null

function getPlacesRatelimit(): Ratelimit {
  if (!placesRatelimit) {
    placesRatelimit = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(PLACES_LIMIT, PLACES_WINDOW),
      prefix: 'ratelimit:places',
    })
  }
  return placesRatelimit
}

export async function checkPlacesRateLimit(identifier: string): Promise<RateLimitResult> {
  return getPlacesRatelimit().limit(identifier)
}
