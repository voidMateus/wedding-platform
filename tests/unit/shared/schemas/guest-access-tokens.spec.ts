import { describe, expect, it } from 'vitest'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

describe('guestAccessTokenGenerateSchema', () => {
  const conviteId = '11111111-1111-1111-1111-111111111111'

  it('aceita conviteId válido', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ conviteId }).success).toBe(true)
  })

  it('rejeita quando conviteId não é informado', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita conviteId que não é uuid', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ conviteId: 'não-é-uuid' }).success).toBe(false)
  })
})
