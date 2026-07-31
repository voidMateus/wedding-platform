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

export async function checkGiftsRateLimit(identifier: string): Promise<RateLimitResult> {
  return getGiftsRatelimit().limit(identifier)
}
