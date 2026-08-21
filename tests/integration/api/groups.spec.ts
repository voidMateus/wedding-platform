import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 */
describe('api: POST /api/groups', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([() => deleteTestMember(admin, member.userId), () => deleteTestWedding(admin, wedding.id)])
  })

  it('caminho feliz: cria o grupo escopado ao próprio casamento do usuário autenticado', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/groups', { nome: 'Família da Noiva', cor: '#5c1a2b' })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.nome).toBe('Família da Noiva')
    expect(body.casamento_id).toBe(wedding.id)

    const { data: stored } = await admin.from('grupos').select('*').eq('id', body.id).single()
    expect(stored?.casamento_id).toBe(wedding.id)
  })

  it('erro de domínio: nome vazio é rejeitado com 400, nenhuma linha é criada', async () => {
    const client = createTestApiClient({ cookie })
    const { count: before } = await admin
      .from('grupos')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)

    const res = await client.post('/api/groups', { nome: '' })
    expect(res.status).toBe(400)

    const { count: after } = await admin
      .from('grupos')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)
    expect(after).toBe(before)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.post('/api/groups', { nome: 'Sem Sessão' })
    expect(res.status).toBe(401)
  })
})
