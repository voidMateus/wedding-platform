import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestInviteTag } from '../../factories/invite-tag'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Cobre POST /api/invite-tags e DELETE /api/invite-tags/[id].
 */
describe('api: POST /api/invite-tags', () => {
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

  it('caminho feliz: cria a etiqueta escopada ao próprio casamento do usuário autenticado', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/invite-tags', { nome: 'Padrinhos' })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.nome).toBe('Padrinhos')
    expect(body.casamento_id).toBe(wedding.id)

    const { data: stored } = await admin.from('etiquetas_convite').select('*').eq('id', body.id).single()
    expect(stored?.casamento_id).toBe(wedding.id)
  })

  it('erro de domínio: nome duplicado no mesmo casamento é rejeitado com 409 (etiquetas_convite_casamento_id_nome_key)', async () => {
    await createTestInviteTag(admin, wedding.id, { nome: 'Família' })
    const client = createTestApiClient({ cookie })

    const { count: before } = await admin
      .from('etiquetas_convite')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)

    const res = await client.post('/api/invite-tags', { nome: 'Família' })
    expect(res.status).toBe(409)

    const { count: after } = await admin
      .from('etiquetas_convite')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)
    expect(after).toBe(before)
  })

  it('erro de domínio: nome vazio é rejeitado com 400', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/invite-tags', { nome: '' })
    expect(res.status).toBe(400)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.post('/api/invite-tags', { nome: 'Sem Sessão' })
    expect(res.status).toBe(401)
  })
})

describe('api: DELETE /api/invite-tags/[id]', () => {
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

  it('caminho feliz: exclui (hard delete) uma etiqueta real do próprio casamento', async () => {
    const tag = await createTestInviteTag(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const res = await client.del(`/api/invite-tags/${tag.id}`)
    expect(res.status).toBe(200)

    const { data: stored } = await admin.from('etiquetas_convite').select('id').eq('id', tag.id).maybeSingle()
    expect(stored).toBeNull()
  })

  it('erro de domínio: etiqueta de outro casamento não é excluída (isolamento por casamento_id)', async () => {
    const otherWedding = await createTestWedding(admin)
    try {
      const tag = await createTestInviteTag(admin, otherWedding.id)
      const client = createTestApiClient({ cookie })

      // O handler não confirma a contagem de linhas afetadas — filtra por
      // casamento_id e sempre responde 200, então o teste que importa é a
      // garantia de isolamento: a etiqueta do outro casamento continua lá.
      const res = await client.del(`/api/invite-tags/${tag.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('etiquetas_convite').select('id').eq('id', tag.id).maybeSingle()
      expect(stored?.id).toBe(tag.id)
    } finally {
      await deleteTestWedding(admin, otherWedding.id)
    }
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const tag = await createTestInviteTag(admin, wedding.id)
    const client = createTestApiClient()
    const res = await client.del(`/api/invite-tags/${tag.id}`)
    expect(res.status).toBe(401)
  })
})
