import { describe, expect, it } from 'vitest'
import { classifyRateLimitPath } from '../../../server/utils/rate-limit-path'

describe('classifyRateLimitPath', () => {
  it('classifica rotas de RSVP por código', () => {
    expect(classifyRateLimitPath('/api/rsvp/abc123')).toBe('rsvp')
    expect(classifyRateLimitPath('/api/rsvp/guests/guest-1')).toBe('rsvp')
  })

  it('classifica a busca pública por nome com slug no caminho (achado real do bug)', () => {
    expect(classifyRateLimitPath('/api/public/joao-e-maria/rsvp-search')).toBe('rsvp-search')
    expect(classifyRateLimitPath('/api/public/ana-carlos-2027/rsvp-search')).toBe('rsvp-search')
  })

  it('classifica a busca por nome mesmo com query string (achado real do Passo 2: event.path do h3 inclui "?q=...", e a rota real de busca sempre tem query string — sem isso o rate limit nunca era aplicado)', () => {
    expect(classifyRateLimitPath('/api/public/joao-e-maria/rsvp-search?q=maria')).toBe('rsvp-search')
    expect(classifyRateLimitPath('/api/public/rsvp-search/select?foo=bar')).toBe('rsvp-search')
  })

  it('classifica os passos seguintes da busca por nome (sem slug)', () => {
    expect(classifyRateLimitPath('/api/public/rsvp-search/select')).toBe('rsvp-search')
    expect(classifyRateLimitPath('/api/public/rsvp-search/confirm')).toBe('rsvp-search')
  })

  it('classifica mutações de presente', () => {
    expect(classifyRateLimitPath('/api/public/gifts/gift-1/reserve')).toBe('gift-mutation')
    expect(classifyRateLimitPath('/api/public/gifts/gift-1/checkout')).toBe('gift-mutation')
    expect(classifyRateLimitPath('/api/public/gifts/gift-1/cancel')).toBe('gift-mutation')
    expect(classifyRateLimitPath('/api/public/gifts/payments/payment-1/status')).toBe('gift-mutation')
  })

  it('não classifica leitura pública da vitrine de presentes (GET, sem limite)', () => {
    expect(classifyRateLimitPath('/api/public/joao-e-maria/gifts')).toBeNull()
  })

  it('não classifica o webhook da InfinitePay (defesa é payment_check, não IP)', () => {
    expect(classifyRateLimitPath('/api/public/gifts/payments/webhook')).toBeNull()
  })

  it('não classifica outras rotas públicas não sensíveis', () => {
    expect(classifyRateLimitPath('/api/public/joao-e-maria/wedding')).toBeNull()
    expect(classifyRateLimitPath('/api/public/joao-e-maria/photos')).toBeNull()
  })
})
