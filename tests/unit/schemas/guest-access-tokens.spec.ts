import { describe, expect, it } from 'vitest'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

describe('guestAccessTokenGenerateSchema', () => {
  const inviteId = '11111111-1111-1111-1111-111111111111'

  it('aceita inviteId válido', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ inviteId }).success).toBe(true)
  })

  it('rejeita quando inviteId não é informado', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita inviteId que não é uuid', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ inviteId: 'não-é-uuid' }).success).toBe(false)
  })
})
