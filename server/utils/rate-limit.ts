import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting com store durável e compartilhado (Upstash Redis — CLAUDE.md,
 * seção 3/14.5/28). Contador em memória de processo não protege nada em
 * ambiente serverless multi-instância — por isso Redis, não um Map local.
 *
 * O client/instância de Ratelimit é montado uma vez por processo (lazy),
 * não a cada requisição.
 */
let rsvpRatelimit: Ratelimit | null = null

function getRsvpRatelimit(): Ratelimit {
  if (!rsvpRatelimit) {
    const config = useRuntimeConfig()
    const redis = new Redis({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken,
    })
    rsvpRatelimit = new Ratelimit({
      redis,
      // Generoso o bastante para um convidado reabrir/editar a resposta
      // algumas vezes seguidas, restritivo o bastante para não permitir
      // varredura automatizada do endpoint (CLAUDE.md, seção 14.5).
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'ratelimit:rsvp',
    })
  }
  return rsvpRatelimit
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
