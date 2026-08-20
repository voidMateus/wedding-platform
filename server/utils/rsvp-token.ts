import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Núcleo puro de assinatura/verificação do token de sessão de RSVP — sem
 * nenhum auto-import do Nitro/Nuxt (useRuntimeConfig, setCookie...), só pra
 * poder ser testado diretamente fora do runtime do servidor
 * (tests/unit/server/rsvp-token.spec.ts), mesmo motivo de
 * guest-access-token.ts ser puro enquanto token-cipher.ts (usa
 * useRuntimeConfig) não tem teste unitário. server/utils/rsvp-session.ts
 * envolve isto com o H3 `event` (cookie).
 */

export interface RsvpTokenPayload {
  weddingId: string
  inviteId: string
  exp: number
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function signRsvpToken(payload: RsvpTokenPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data, secret)}`
}

export function verifyRsvpToken(token: string, secret: string): RsvpTokenPayload | null {
  const [data, signature] = token.split('.')
  if (!data || !signature) {
    return null
  }

  // Comparação em tempo constante — evita vazar o hash certo por timing.
  const expected = Buffer.from(sign(data, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Partial<RsvpTokenPayload>
    if (
      typeof payload.weddingId !== 'string' ||
      typeof payload.inviteId !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    if (payload.exp < Date.now()) {
      return null
    }
    return payload as RsvpTokenPayload
  } catch {
    return null
  }
}
