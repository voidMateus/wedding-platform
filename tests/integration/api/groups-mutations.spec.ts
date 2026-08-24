import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGroup } from '../../factories/group'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Cobre PATCH/DELETE /api/groups/[id] — POST já é coberto por groups.spec.ts.
 */
describe('api: PATCH /api/groups/[id]', () => {
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

  it('caminho feliz: atualiza um grupo real do próprio casamento', async () => {
    const group = await createTestGroup(admin, wedding.id, { nome: 'Nome Original' })
    const client = createTestApiClient({ cookie })

    const res = await client.patch(`/api/groups/${group.id}`, { nome: 'Nome Atualizado', cor: '#123456' })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.nome).toBe('Nome Atualizado')

    const { data: stored } = await admin.from('grupos').select('*').eq('id', group.id).single()
    expect(stored?.nome).toBe('Nome Atualizado')
    expect(stored?.cor).toBe('#123456')
  })

  it('erro de domínio: grupo de outro casamento é rejeitado com 404, sem alterar nada', async () => {
    const otherWedding = await createTestWedding(admin)
    try {
      const group = await createTestGroup(admin, otherWedding.id, { nome: 'Nome Original' })
      const client = createTestApiClient({ cookie })

      const res = await client.patch(`/api/groups/${group.id}`, { nome: 'Tentativa Cross-Wedding' })
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('grupos').select('nome').eq('id', group.id).single()
      expect(stored?.nome).toBe('Nome Original')
    } finally {
      await deleteTestWedding(admin, otherWedding.id)
    }
  })

  it('erro de domínio: nome vazio é rejeitado com 400', async () => {
    const group = await createTestGroup(admin, wedding.id)
    const client = createTestApiClient({ cookie })
    const res = await client.patch(`/api/groups/${group.id}`, { nome: '' })
    expect(res.status).toBe(400)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const group = await createTestGroup(admin, wedding.id)
    const client = createTestApiClient()
    const res = await client.patch(`/api/groups/${group.id}`, { nome: 'Sem Sessão' })
    expect(res.status).toBe(401)
  })
})

describe('api: DELETE /api/groups/[id]', () => {
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

  it('caminho feliz: soft-deleta um grupo real do próprio casamento', async () => {
    const group = await createTestGroup(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const res = await client.del(`/api/groups/${group.id}`)
    expect(res.status).toBe(200)

    const { data: stored } = await admin.from('grupos').select('excluido_em').eq('id', group.id).single()
    expect(stored?.excluido_em).not.toBeNull()
  })

  it('erro de domínio: grupo de outro casamento é rejeitado com 404, sem excluir nada', async () => {
    const otherWedding = await createTestWedding(admin)
    try {
      const group = await createTestGroup(admin, otherWedding.id)
      const client = createTestApiClient({ cookie })

      const res = await client.del(`/api/groups/${group.id}`)
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('grupos').select('excluido_em').eq('id', group.id).single()
      expect(stored?.excluido_em).toBeNull()
    } finally {
      await deleteTestWedding(admin, otherWedding.id)
    }
  })

  it('erro de domínio: excluir um id inexistente retorna 404', async () => {
    const res = await createTestApiClient({ cookie }).del('/api/groups/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const group = await createTestGroup(admin, wedding.id)
    const client = createTestApiClient()
    const res = await client.del(`/api/groups/${group.id}`)
    expect(res.status).toBe(401)
  })
})
