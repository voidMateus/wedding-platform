import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestEventSegment } from '../../factories/event-segment'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Os sub-endpoints de imagem (`[id]/image-upload.post.ts`/`.delete.ts`)
 * ficam de fora — exigem upload multipart, prioridade menor/mais complexo.
 */
describe('api: /api/event-segments', () => {
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

  describe('POST /api/event-segments', () => {
    it('caminho feliz: cria o item do cronograma escopado ao próprio casamento do usuário autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', { titulo: 'Cerimônia' })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.titulo).toBe('Cerimônia')
      expect(body.casamento_id).toBe(wedding.id)

      const { data: stored } = await admin.from('etapas_evento').select('*').eq('id', body.id).single()
      expect(stored?.casamento_id).toBe(wedding.id)
    })

    it('erro de domínio: título vazio é rejeitado com 400, nenhuma linha é criada', async () => {
      const client = createTestApiClient({ cookie })
      const { count: before } = await admin
        .from('etapas_evento')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)

      const res = await client.post('/api/event-segments', { titulo: '' })
      expect(res.status).toBe(400)

      const { count: after } = await admin
        .from('etapas_evento')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)
      expect(after).toBe(before)
    })
  })

  describe('PATCH /api/event-segments/[id]', () => {
    it('caminho feliz: atualiza título e local do item do cronograma', async () => {
      const segment = await createTestEventSegment(admin, wedding.id, { titulo: 'Original' })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/event-segments/${segment.id}`, {
        titulo: 'Recepção',
        nomeLocal: 'Salão Jardim',
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.titulo).toBe('Recepção')
      expect(body.nome_local).toBe('Salão Jardim')

      const { data: stored } = await admin.from('etapas_evento').select('*').eq('id', segment.id).single()
      expect(stored?.titulo).toBe('Recepção')
      expect(stored?.nome_local).toBe('Salão Jardim')
    })

    it('erro de domínio: mesmoLocalQue apontando para o próprio item é rejeitado com 400 (server/utils/validate-same-venue.ts)', async () => {
      const segment = await createTestEventSegment(admin, wedding.id, { titulo: 'Auto-referência' })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/event-segments/${segment.id}`, {
        titulo: segment.titulo,
        mesmoLocalQue: segment.id,
      })
      expect(res.status).toBe(400)

      const { data: stored } = await admin.from('etapas_evento').select('*').eq('id', segment.id).single()
      expect(stored?.mesmo_local_que).toBeNull()
    })
  })

  describe('DELETE /api/event-segments/[id]', () => {
    it('caminho feliz: exclusão física — a linha deixa de existir (etapas_evento não tem soft delete)', async () => {
      const segment = await createTestEventSegment(admin, wedding.id, { titulo: 'Para Excluir' })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/event-segments/${segment.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('etapas_evento').select('*').eq('id', segment.id).maybeSingle()
      expect(stored).toBeNull()
    })

    it('erro de domínio: excluir um segmento que outro referencia via mesmoLocalQue é bloqueado (docs/DATABASE.md §3.2)', async () => {
      const original = await createTestEventSegment(admin, wedding.id, { titulo: 'Local Original' })
      await createTestEventSegment(admin, wedding.id, {
        titulo: 'Local Dependente',
        mesmo_local_que: original.id,
      })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/event-segments/${original.id}`)
      expect(res.status).toBe(400)

      const { data: stored } = await admin.from('etapas_evento').select('*').eq('id', original.id).maybeSingle()
      expect(stored).not.toBeNull()
    })
  })
})
