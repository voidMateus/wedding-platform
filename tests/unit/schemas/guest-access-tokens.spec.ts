import { describe, expect, it } from 'vitest'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

describe('guestAccessTokenGenerateSchema', () => {
  const guestId = '11111111-1111-1111-1111-111111111111'
  const groupId = '22222222-2222-2222-2222-222222222222'

  it('aceita apenas guestId', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ guestId }).success).toBe(true)
  })

  it('aceita apenas groupId', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ groupId }).success).toBe(true)
  })

  it('rejeita quando os dois são informados', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ guestId, groupId }).success).toBe(false)
  })

  it('rejeita quando nenhum é informado', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita ids que não são uuid', () => {
    expect(guestAccessTokenGenerateSchema.safeParse({ guestId: 'não-é-uuid' }).success).toBe(false)
  })
})
