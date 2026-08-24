import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGiftCategory } from '../../factories/gift-category'
import { createTestGift } from '../../factories/gift'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 */
describe('api: /api/gift-categories', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  // Segundo casamento/membro só para o caso de isolamento entre tenants
  // (PATCH cross-wedding).
  let otherWedding: Awaited<ReturnType<typeof createTestWedding>>
  let otherMember: Awaited<ReturnType<typeof createTestMember>>
  let otherCookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)

    otherWedding = await createTestWedding(admin)
    otherMember = await createTestMember(admin, otherWedding.id)
    otherCookie = await getAdminSessionCookie(otherMember.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
      () => deleteTestMember(admin, otherMember.userId),
      () => deleteTestWedding(admin, otherWedding.id),
    ])
  })

  describe('POST /api/gift-categories', () => {
    it('caminho feliz: cria a categoria escopada ao próprio casamento do usuário autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/gift-categories', { nome: 'Cozinha' })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.nome).toBe('Cozinha')
      expect(body.casamento_id).toBe(wedding.id)

      const { data: stored } = await admin.from('categorias_presentes').select('*').eq('id', body.id).single()
      expect(stored?.casamento_id).toBe(wedding.id)
    })

    it('erro de domínio: nome vazio é rejeitado com 400, nenhuma linha é criada', async () => {
      const client = createTestApiClient({ cookie })
      const { count: before } = await admin
        .from('categorias_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)

      const res = await client.post('/api/gift-categories', { nome: '' })
      expect(res.status).toBe(400)

      const { count: after } = await admin
        .from('categorias_presentes')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)
      expect(after).toBe(before)
    })
  })

  describe('PATCH /api/gift-categories/[id]', () => {
    it('caminho feliz: atualiza nome/ordem de exibição da categoria', async () => {
      const category = await createTestGiftCategory(admin, wedding.id, { nome: 'Original' })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/gift-categories/${category.id}`, {
        nome: 'Eletrodomésticos',
        ordemExibicao: 3,
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.nome).toBe('Eletrodomésticos')
      expect(body.ordem_exibicao).toBe(3)

      const { data: stored } = await admin.from('categorias_presentes').select('*').eq('id', category.id).single()
      expect(stored?.nome).toBe('Eletrodomésticos')
      expect(stored?.ordem_exibicao).toBe(3)
    })

    it('isolamento: membro de OUTRO casamento não consegue editar esta categoria (404, linha inalterada)', async () => {
      const category = await createTestGiftCategory(admin, wedding.id, { nome: 'Categoria Isolada' })

      const otherClient = createTestApiClient({ cookie: otherCookie })
      const res = await otherClient.patch(`/api/gift-categories/${category.id}`, { nome: 'Sequestrada' })
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('categorias_presentes').select('*').eq('id', category.id).single()
      expect(stored?.nome).toBe('Categoria Isolada')
    })
  })

  describe('DELETE /api/gift-categories/[id]', () => {
    it('caminho feliz: exclusão física — a linha deixa de existir', async () => {
      const category = await createTestGiftCategory(admin, wedding.id, { nome: 'Para Excluir' })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/gift-categories/${category.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin
        .from('categorias_presentes')
        .select('*')
        .eq('id', category.id)
        .maybeSingle()
      expect(stored).toBeNull()
    })

    it('comportamento real: excluir categoria com presente vinculado não é bloqueado — presentes.categoria_id vira null (ON DELETE SET NULL)', async () => {
      const category = await createTestGiftCategory(admin, wedding.id, { nome: 'Categoria Com Presente' })
      const gift = await createTestGift(admin, wedding.id, { categoria_id: category.id })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/gift-categories/${category.id}`)
      expect(res.status).toBe(200)

      const { data: storedCategory } = await admin
        .from('categorias_presentes')
        .select('*')
        .eq('id', category.id)
        .maybeSingle()
      expect(storedCategory).toBeNull()

      const { data: storedGift } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      expect(storedGift).not.toBeNull()
      expect(storedGift?.categoria_id).toBeNull()
    })
  })
})
