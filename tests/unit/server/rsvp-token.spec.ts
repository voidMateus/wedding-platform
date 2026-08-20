import { describe, expect, it } from 'vitest'
import { signRsvpToken, verifyRsvpToken } from '../../../server/utils/rsvp-token'

const SECRET = 'segredo-de-teste-nao-usar-em-producao'

describe('signRsvpToken / verifyRsvpToken', () => {
  it('round-trip: token assinado verifica de volta com o mesmo payload', () => {
    const payload = { weddingId: 'w1', inviteId: 'i1', exp: Date.now() + 60_000 }
    const token = signRsvpToken(payload, SECRET)

    expect(verifyRsvpToken(token, SECRET)).toEqual(payload)
  })

  it('rejeita token com assinatura adulterada', () => {
    const token = signRsvpToken({ weddingId: 'w1', inviteId: 'i1', exp: Date.now() + 60_000 }, SECRET)
    const [data] = token.split('.')
    const tampered = `${data}.assinatura-forjada`

    expect(verifyRsvpToken(tampered, SECRET)).toBeNull()
  })

  it('rejeita token com payload adulterado (inviteId trocado) mesmo mantendo a assinatura original', () => {
    const token = signRsvpToken({ weddingId: 'w1', inviteId: 'i1', exp: Date.now() + 60_000 }, SECRET)
    const [, signature] = token.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ weddingId: 'w1', inviteId: 'invite-de-outra-pessoa', exp: Date.now() + 60_000 })).toString(
      'base64url',
    )

    expect(verifyRsvpToken(`${forgedPayload}.${signature}`, SECRET)).toBeNull()
  })

  it('rejeita token verificado com um secret diferente do usado pra assinar', () => {
    const token = signRsvpToken({ weddingId: 'w1', inviteId: 'i1', exp: Date.now() + 60_000 }, SECRET)

    expect(verifyRsvpToken(token, 'outro-secret')).toBeNull()
  })

  it('rejeita token expirado', () => {
    const token = signRsvpToken({ weddingId: 'w1', inviteId: 'i1', exp: Date.now() - 1000 }, SECRET)

    expect(verifyRsvpToken(token, SECRET)).toBeNull()
  })

  it('rejeita token malformado (sem separador)', () => {
    expect(verifyRsvpToken('nao-e-um-token-valido', SECRET)).toBeNull()
  })

  it('rejeita token com payload que não é JSON válido', () => {
    const garbage = Buffer.from('não é json').toString('base64url')
    const token = `${garbage}.${'x'.repeat(43)}`

    expect(verifyRsvpToken(token, SECRET)).toBeNull()
  })
})
