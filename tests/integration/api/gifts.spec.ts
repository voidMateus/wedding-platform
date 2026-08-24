import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGift } from '../../factories/gift'
import { createTestGiftReservation } from '../../factories/gift-reservation'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação de presentes. Bate
 * via HTTP real no servidor de build (tests/integration/global-setup.ts),
 * com uma sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Presente físico (e_presente_cota=false, gift_reservations) e presente de
 * cota (e_presente_cota=true, gift_contributions) são dois modos mutuamente
 * exclusivos (CLAUDE.md, seção 12.2) — cobertos separadamente abaixo.
 */
describe('api: /api/gifts', () => {
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

  describe('POST /api/gifts', () => {
    it('caminho feliz: cria um presente FÍSICO (ePresenteCota: false), reserva exclusiva', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/gifts', {
        titulo: 'Jogo de Panelas',
        precoCentavos: 45000,
        ePresenteCota: false,
        quantidadeDisponivel: 2,
      })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.titulo).toBe('Jogo de Panelas')
      expect(body.casamento_id).toBe(wedding.id)
      expect(body.e_presente_cota).toBe(false)
      expect(body.preco_centavos).toBe(45000)
      expect(body.quantidade_disponivel).toBe(2)
      expect(body.valor_meta_centavos).toBeNull()
      expect(body.valor_cota_centavos).toBeNull()

      const { data: stored } = await admin.from('presentes').select('*').eq('id', body.id).single()
      expect(stored?.casamento_id).toBe(wedding.id)
      expect(stored?.e_presente_cota).toBe(false)
    })

    it('caminho feliz: cria um presente de COTA (ePresenteCota: true), contribuições somadas até a meta', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/gifts', {
        titulo: 'Lua de Mel em Fernando de Noronha',
        ePresenteCota: true,
        valorMetaCentavos: 500000,
        valorCotaCentavos: 5000,
      })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.titulo).toBe('Lua de Mel em Fernando de Noronha')
      expect(body.casamento_id).toBe(wedding.id)
      expect(body.e_presente_cota).toBe(true)
      expect(body.valor_meta_centavos).toBe(500000)
      expect(body.valor_cota_centavos).toBe(5000)
      expect(body.quantidade_disponivel).toBeNull()

      const { data: stored } = await admin.from('presentes').select('*').eq('id', body.id).single()
      expect(stored?.e_presente_cota).toBe(true)
      expect(stored?.quantidade_disponivel).toBeNull()
    })

    it('erro de domínio: presente de cota sem valorMetaCentavos é rejeitado com 400, nenhuma linha criada', async () => {
      const client = createTestApiClient({ cookie })
      const { count: before } = await admin
        .from('presentes')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)

      const res = await client.post('/api/gifts', {
        titulo: 'Presente de Cota Incompleto',
        ePresenteCota: true,
      })
      expect(res.status).toBe(400)

      const { count: after } = await admin
        .from('presentes')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)
      expect(after).toBe(before)
    })

    it('erro de domínio: estiloExibicao inválido é rejeitado com 400', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/gifts', {
        titulo: 'Presente Com Estilo Inválido',
        ePresenteCota: false,
        quantidadeDisponivel: 1,
        estiloExibicao: 'estilo-que-nao-existe',
      })
      expect(res.status).toBe(400)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/gifts', {
        titulo: 'Sem Sessão',
        ePresenteCota: false,
        quantidadeDisponivel: 1,
      })
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/gifts/[id]', () => {
    it('caminho feliz: atualiza título e preço', async () => {
      const gift = await createTestGift(admin, wedding.id, { titulo: 'Título Original', preco_centavos: 10000 })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/gifts/${gift.id}`, {
        titulo: 'Título Atualizado',
        precoCentavos: 20000,
        ePresenteCota: false,
        quantidadeDisponivel: gift.quantidade_disponivel ?? 1,
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.titulo).toBe('Título Atualizado')
      expect(body.preco_centavos).toBe(20000)

      const { data: stored } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      expect(stored?.titulo).toBe('Título Atualizado')
      expect(stored?.preco_centavos).toBe(20000)
    })

    it('isolamento: membro de OUTRO casamento não consegue editar este presente (404, linha inalterada)', async () => {
      const gift = await createTestGift(admin, wedding.id, { titulo: 'Presente Isolado' })

      const otherClient = createTestApiClient({ cookie: otherCookie })
      const res = await otherClient.patch(`/api/gifts/${gift.id}`, {
        titulo: 'Sequestrado',
        ePresenteCota: false,
        quantidadeDisponivel: 1,
      })
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      expect(stored?.titulo).toBe('Presente Isolado')
    })
  })

  describe('DELETE /api/gifts/[id]', () => {
    it('caminho feliz: soft-delete — excluido_em é preenchido, a linha permanece', async () => {
      const gift = await createTestGift(admin, wedding.id, { titulo: 'Presente Para Excluir' })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/gifts/${gift.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      expect(stored).not.toBeNull()
      expect(stored?.excluido_em).not.toBeNull()
    })

    it('domínio: presente com reserva associada ainda é soft-deletado, preservando o histórico da reserva', async () => {
      const gift = await createTestGift(admin, wedding.id, { titulo: 'Presente Já Reservado' })
      const reservation = await createTestGiftReservation(admin, wedding.id, gift.id)

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/gifts/${gift.id}`)
      expect(res.status).toBe(200)

      const { data: storedGift } = await admin.from('presentes').select('*').eq('id', gift.id).single()
      expect(storedGift?.excluido_em).not.toBeNull()

      const { data: storedReservation } = await admin
        .from('reservas_presentes')
        .select('*')
        .eq('id', reservation.id)
        .single()
      expect(storedReservation).not.toBeNull()
      expect(storedReservation?.presente_id).toBe(gift.id)
    })

    it('domínio: excluir um presente inexistente retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.del('/api/gifts/00000000-0000-0000-0000-000000000000')
      expect(res.status).toBe(404)
    })
  })
})
