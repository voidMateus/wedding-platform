import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestPhoto } from '../../factories/photo'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio para mutações de fotos da galeria (CLAUDE.md,
 * seção 22.2 — ponto de foco; drag-and-drop de reordenação). Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 */
describe('api: /api/photos', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  // Segundo casamento/membro só para o caso de isolamento entre tenants.
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
    // Guarda cada limpeza atrás de um check de existência — se o `beforeAll`
    // falhar no meio (ex.: rate limit do Supabase Auth sob carga concorrente
    // de outras suítes), as fixtures posteriores (`otherMember`/`otherWedding`)
    // nunca chegam a existir; acessar `.userId`/`.id` nelas dentro do array
    // do `cleanupAll` lançaria um TypeError síncrono e abortaria a limpeza das
    // fixtures anteriores que de fato foram criadas (docs/ARCHITECTURE.md,
    // seção 9.4 — nunca deixar lixo de teste no Supabase real).
    const cleanups: Array<() => Promise<unknown>> = []
    if (member) cleanups.push(() => deleteTestMember(admin, member.userId))
    if (wedding) cleanups.push(() => deleteTestWedding(admin, wedding.id))
    if (otherMember) cleanups.push(() => deleteTestMember(admin, otherMember.userId))
    if (otherWedding) cleanups.push(() => deleteTestWedding(admin, otherWedding.id))
    await cleanupAll(cleanups)
  })

  describe('PATCH /api/photos/[id]', () => {
    it('caminho feliz: atualiza legenda e ponto de foco', async () => {
      const photo = await createTestPhoto(admin, wedding.id, { legenda: 'Legenda Original' })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/photos/${photo.id}`, {
        legenda: 'Nova Legenda',
        ordemExibicao: 3,
        focoX: 30,
        focoY: 70,
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.legenda).toBe('Nova Legenda')
      expect(body.ordem_exibicao).toBe(3)
      expect(body.foco_x).toBe(30)
      expect(body.foco_y).toBe(70)
      expect(typeof body.url).toBe('string')

      const { data: stored } = await admin.from('fotos').select('*').eq('id', photo.id).single()
      expect(stored?.legenda).toBe('Nova Legenda')
      expect(stored?.ordem_exibicao).toBe(3)
      expect(stored?.foco_x).toBe(30)
      expect(stored?.foco_y).toBe(70)
    })

    it('isolamento: membro de OUTRO casamento não consegue editar esta foto (404, linha inalterada)', async () => {
      const photo = await createTestPhoto(admin, wedding.id, { legenda: 'Foto Isolada' })

      const otherClient = createTestApiClient({ cookie: otherCookie })
      const res = await otherClient.patch(`/api/photos/${photo.id}`, {
        legenda: 'Sequestrada',
        ordemExibicao: 0,
        focoX: 50,
        focoY: 50,
      })
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('fotos').select('*').eq('id', photo.id).single()
      expect(stored?.legenda).toBe('Foto Isolada')
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const photo = await createTestPhoto(admin, wedding.id)
      const client = createTestApiClient()
      const res = await client.patch(`/api/photos/${photo.id}`, {
        legenda: 'Sem Sessão',
        ordemExibicao: 0,
        focoX: 50,
        focoY: 50,
      })
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/photos/reorder', () => {
    it('caminho feliz: reordena 3 fotos, ordem_exibicao reflete a posição enviada', async () => {
      const photoA = await createTestPhoto(admin, wedding.id, { ordem_exibicao: 0 })
      const photoB = await createTestPhoto(admin, wedding.id, { ordem_exibicao: 1 })
      const photoC = await createTestPhoto(admin, wedding.id, { ordem_exibicao: 2 })

      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/photos/reorder', { ids: [photoC.id, photoA.id, photoB.id] })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)

      const { data: storedC } = await admin.from('fotos').select('*').eq('id', photoC.id).single()
      const { data: storedA } = await admin.from('fotos').select('*').eq('id', photoA.id).single()
      const { data: storedB } = await admin.from('fotos').select('*').eq('id', photoB.id).single()
      expect(storedC?.ordem_exibicao).toBe(0)
      expect(storedA?.ordem_exibicao).toBe(1)
      expect(storedB?.ordem_exibicao).toBe(2)
    })

    it('domínio: id de foto de OUTRO casamento no payload nunca é reordenado (isolamento preservado)', async () => {
      const ownPhoto = await createTestPhoto(admin, wedding.id, { ordem_exibicao: 9 })
      const foreignPhoto = await createTestPhoto(admin, otherWedding.id, { ordem_exibicao: 5 })

      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/photos/reorder', { ids: [ownPhoto.id, foreignPhoto.id] })
      // O handler filtra por casamento_id na própria query de update — a foto
      // de outro tenant não é encontrada (0 linhas afetadas), mas isso não é
      // reportado como erro; a garantia real é que ela nunca é escrita.
      expect(res.status).toBe(200)

      const { data: storedOwn } = await admin.from('fotos').select('*').eq('id', ownPhoto.id).single()
      expect(storedOwn?.ordem_exibicao).toBe(0)

      const { data: storedForeign } = await admin.from('fotos').select('*').eq('id', foreignPhoto.id).single()
      expect(storedForeign?.ordem_exibicao).toBe(5)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.patch('/api/photos/reorder', { ids: ['00000000-0000-0000-0000-000000000000'] })
      expect(res.status).toBe(401)
    })
  })
})
