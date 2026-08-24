import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestInvite } from '../../factories/invite'
import { createTestGuest } from '../../factories/guest'
import { createTestAccessToken } from '../../factories/access-token'

/**
 * Caminho do convidado (docs/ARCHITECTURE.md, seção 9.1/9.2) — RLS não
 * protege nada aqui (os endpoints usam service_role). O que garante que um
 * convidado só acessa o próprio convite é a sessão de RSVP
 * (server/utils/rsvp-session.ts) — é exatamente isso que esta suíte cobre.
 */
describe('guest-path: RSVP por link/QR (/api/rsvp/[code])', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let inviteB: Awaited<ReturnType<typeof createTestInvite>>
  let guestA: Awaited<ReturnType<typeof createTestGuest>>
  let guestB: Awaited<ReturnType<typeof createTestGuest>>
  let codeA: string

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    inviteA = await createTestInvite(admin, weddingA.id)
    inviteB = await createTestInvite(admin, weddingB.id)
    guestA = await createTestGuest(admin, weddingA.id, { convite_id: inviteA.id, nome_completo: 'Convidado A' })
    guestB = await createTestGuest(admin, weddingB.id, { convite_id: inviteB.id, nome_completo: 'Convidado B' })
    const token = await createTestAccessToken(admin, weddingA.id, inviteA.id)
    codeA = token.plainCode
  })

  afterAll(async () => {
    await cleanupAll([() => deleteTestWedding(admin, weddingA.id), () => deleteTestWedding(admin, weddingB.id)])
  })

  it('código válido retorna o payload do convite certo e emite sessão', async () => {
    const client = createTestApiClient()
    const res = await client.get(`/api/rsvp/${codeA}`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.inviteId).toBe(inviteA.id)
    expect(res.headers.get('set-cookie')).toMatch(/rsvp_session=/)
  })

  it('código inexistente retorna 404, nunca vaza se o convite existe', async () => {
    const client = createTestApiClient()
    const res = await client.get('/api/rsvp/codigo-que-nao-existe-em-nenhum-lugar')
    expect(res.status).toBe(404)
  })

  it('sessão emitida para o convite A confirma o próprio convidado normalmente', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeA}`)

    const res = await client.put(`/api/rsvp/guests/${guestA.id}`, { status: 'confirmado' })
    expect(res.status).toBe(200)
  })

  it('sessão emitida para o convite A NUNCA altera um convidado do convite B (posse comprovada)', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeA}`)

    const res = await client.put(`/api/rsvp/guests/${guestB.id}`, { status: 'confirmado' })
    expect(res.status).toBe(403)

    const { data: unchanged } = await admin.from('convidados').select('*').eq('id', guestB.id).single()
    expect(unchanged).not.toBeNull()
  })

  it('sem sessão nenhuma, a mutação é bloqueada mesmo com um guestId válido', async () => {
    const client = createTestApiClient()
    const res = await client.put(`/api/rsvp/guests/${guestA.id}`, { status: 'confirmado' })
    expect(res.status).toBe(403)
  })
})
