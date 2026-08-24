import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestEventSegment } from '../../factories/event-segment'
import { createTestPhoto } from '../../factories/photo'
import { createTestGift } from '../../factories/gift'
import { createTestGiftCategory } from '../../factories/gift-category'

/**
 * Caminho público do site (docs/ARCHITECTURE.md, seção 9.1/9.2, CLAUDE.md
 * seção 4.2) — sem autenticação e sem token: qualquer visitante com o link
 * acessa. Não há RLS nem sessão protegendo esses quatro endpoints (leitura
 * pura, `service_role`/anon com policy `select using (true)`) — quem garante
 * que um casamento nunca vê dado de outro, e que só o subconjunto de campos
 * genuinamente público é exposto, é o código de `server/api/public/[slug]/*`.
 * É exatamente isso que esta suíte cobre: isolamento por slug e forma exata
 * do payload (nenhum campo administrativo/sensível vazando por acidente).
 */
describe('guest-path: leituras públicas do site (/api/public/[slug]/*)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin, {
      nomes_noivos: 'Ana & Bruno',
      data_evento: '2030-06-15',
      horario_evento: '16:30:00',
      config_tema: { corPrimaria: '#112233' },
      config_conteudo: { historia: 'Nosso início, casamento A' },
      handle_infinitepay: 'anaebruno',
      prazo_rsvp: '2030-05-01',
      idade_maxima_crianca: 10,
      modo_lista_convidados: 'fechada',
      modo_entrega_presente_fisico: 'ambos',
    })
    weddingB = await createTestWedding(admin, {
      nomes_noivos: 'Carla & Diego',
      data_evento: '2031-09-20',
      horario_evento: '19:00:00',
      config_tema: { corPrimaria: '#445566' },
      config_conteudo: { historia: 'Outro início, casamento B' },
      modo_entrega_presente_fisico: 'somente_compra_propria',
    })
  })

  afterAll(async () => {
    await cleanupAll([() => deleteTestWedding(admin, weddingA.id), () => deleteTestWedding(admin, weddingB.id)])
  })

  describe('GET /api/public/[slug]/wedding', () => {
    it('slug válido retorna os dados do casamento certo, nunca do outro', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/wedding`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.id).toBe(weddingA.id)
      expect(body.slug).toBe(weddingA.slug)
      expect(body.nomes_noivos).toBe('Ana & Bruno')
      expect(body.data_evento).toBe('2030-06-15')
      expect(body.horario_evento).toBe('16:30:00')
      expect(body.config_tema).toEqual({ corPrimaria: '#112233' })
      expect(body.config_conteudo).toEqual({ historia: 'Nosso início, casamento A' })

      expect(body.id).not.toBe(weddingB.id)
      expect(body.nomes_noivos).not.toBe(weddingB.nomes_noivos)
    })

    it('expõe só o subconjunto público de campos — nunca prazo/config administrativa', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/wedding`)
      const body = await res.json()

      expect(Object.keys(body).sort()).toEqual(
        ['id', 'slug', 'nomes_noivos', 'data_evento', 'horario_evento', 'config_tema', 'config_conteudo'].sort(),
      )
      // Campos administrativos existem na linha real (definidos no beforeAll)
      // mas nunca devem aparecer no payload público.
      expect(body).not.toHaveProperty('handle_infinitepay')
      expect(body).not.toHaveProperty('prazo_rsvp')
      expect(body).not.toHaveProperty('idade_maxima_crianca')
      expect(body).not.toHaveProperty('modo_lista_convidados')
      expect(body).not.toHaveProperty('modo_entrega_presente_fisico')
      expect(body).not.toHaveProperty('status_ciclo_vida')
      expect(body).not.toHaveProperty('arquivado_em')
      expect(body).not.toHaveProperty('created_at')
      expect(body).not.toHaveProperty('updated_at')
    })

    it('slug inexistente retorna 404 limpo, sem vazar detalhe interno', async () => {
      const client = createTestApiClient()
      const res = await client.get('/api/public/slug-que-nao-existe-em-nenhum-lugar/wedding')
      expect(res.status).toBe(404)

      const body = await res.json()
      const raw = JSON.stringify(body)
      expect(raw).not.toMatch(/PGRST|relation|column|SELECT|postgres/i)
      expect(body.stack).toBeUndefined()
    })
  })

  describe('GET /api/public/[slug]/event-segments', () => {
    let segmentA: Awaited<ReturnType<typeof createTestEventSegment>>
    let segmentB: Awaited<ReturnType<typeof createTestEventSegment>>

    beforeAll(async () => {
      segmentA = await createTestEventSegment(admin, weddingA.id, {
        titulo: 'Cerimônia do Casamento A',
        nome_local: 'Igreja A',
        ordem_exibicao: 0,
      })
      segmentB = await createTestEventSegment(admin, weddingB.id, {
        titulo: 'Cerimônia do Casamento B',
        nome_local: 'Igreja B',
        ordem_exibicao: 0,
      })
    })

    it('slug válido retorna as etapas do casamento certo, nunca do outro', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/event-segments`)
      expect(res.status).toBe(200)

      const body = await res.json()
      const ids: string[] = body.data.map((segment: { id: string }) => segment.id)
      expect(ids).toContain(segmentA.id)
      expect(ids).not.toContain(segmentB.id)

      const titles: string[] = body.data.map((segment: { titulo: string }) => segment.titulo)
      expect(titles).toContain('Cerimônia do Casamento A')
      expect(titles).not.toContain('Cerimônia do Casamento B')
    })

    it('slug inexistente retorna 404 limpo', async () => {
      const client = createTestApiClient()
      const res = await client.get('/api/public/slug-que-nao-existe-em-nenhum-lugar/event-segments')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/public/[slug]/photos', () => {
    let photoA: Awaited<ReturnType<typeof createTestPhoto>>
    let photoB: Awaited<ReturnType<typeof createTestPhoto>>

    beforeAll(async () => {
      photoA = await createTestPhoto(admin, weddingA.id, {
        legenda: 'Foto do Casamento A',
        id_arquivo_origem: 'drive-id-casamento-a',
        ordem_exibicao: 0,
      })
      photoB = await createTestPhoto(admin, weddingB.id, {
        legenda: 'Foto do Casamento B',
        id_arquivo_origem: 'drive-id-casamento-b',
        ordem_exibicao: 0,
      })
    })

    it('slug válido retorna as fotos do casamento certo com URL resolvida, nunca do outro', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/photos`)
      expect(res.status).toBe(200)

      const body = await res.json()
      const ids: string[] = body.data.map((photo: { id: string }) => photo.id)
      expect(ids).toContain(photoA.id)
      expect(ids).not.toContain(photoB.id)

      const found = body.data.find((photo: { id: string }) => photo.id === photoA.id)
      expect(found.legenda).toBe('Foto do Casamento A')
      expect(found.url).toBe('https://drive.google.com/thumbnail?id=drive-id-casamento-a&sz=w1600')

      const raw = JSON.stringify(body)
      expect(raw).not.toContain('Foto do Casamento B')
      expect(raw).not.toContain('drive-id-casamento-b')
    })

    it('slug inexistente retorna 404 limpo', async () => {
      const client = createTestApiClient()
      const res = await client.get('/api/public/slug-que-nao-existe-em-nenhum-lugar/photos')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/public/[slug]/gifts', () => {
    let categoryA: Awaited<ReturnType<typeof createTestGiftCategory>>
    let giftPhysicalA: Awaited<ReturnType<typeof createTestGift>>
    let giftGroupA: Awaited<ReturnType<typeof createTestGift>>
    let giftB: Awaited<ReturnType<typeof createTestGift>>

    beforeAll(async () => {
      categoryA = await createTestGiftCategory(admin, weddingA.id, { nome: 'Cozinha' })
      giftPhysicalA = await createTestGift(admin, weddingA.id, {
        titulo: 'Jogo de Panelas',
        descricao: 'Panelas antiaderentes',
        preco_centavos: 45000,
        quantidade_disponivel: 3,
        categoria_id: categoryA.id,
        url_imagem: 'https://example.com/panelas.jpg',
      })
      giftGroupA = await createTestGift(admin, weddingA.id, {
        titulo: 'Lua de Mel',
        e_presente_cota: true,
        preco_centavos: null,
        quantidade_disponivel: null,
        valor_meta_centavos: 500000,
        valor_cota_centavos: 10000,
      })
      giftB = await createTestGift(admin, weddingB.id, { titulo: 'Presente Só Do Casamento B' })

      // Reserva/contribuição real — nunca deve vazar quem presenteou, e a
      // contagem (`collectedAmountCents`) precisa ser recalculada no
      // servidor a partir daqui, nunca aceita do client (CLAUDE.md, seção 4.2/12).
      await admin.from('reservas_presentes').insert({
        casamento_id: weddingA.id,
        presente_id: giftPhysicalA.id,
        nome_contribuinte: 'Presenteador Sigiloso',
        telefone_presenteador: '11999999999',
      })
      await admin.from('contribuicoes_presentes').insert([
        {
          casamento_id: weddingA.id,
          presente_id: giftGroupA.id,
          valor_centavos: 10000,
          nome_contribuinte: 'Contribuinte Sigiloso Um',
          telefone_presenteador: '11988888888',
        },
        {
          casamento_id: weddingA.id,
          presente_id: giftGroupA.id,
          valor_centavos: 20000,
          nome_contribuinte: 'Contribuinte Sigiloso Dois',
          telefone_presenteador: '11977777777',
        },
      ])
    })

    it('slug válido retorna o DTO público dos presentes do casamento certo, nunca do outro', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/gifts`)
      expect(res.status).toBe(200)

      const body = await res.json()
      const ids: string[] = body.data.map((gift: { id: string }) => gift.id)
      expect(ids).toContain(giftPhysicalA.id)
      expect(ids).toContain(giftGroupA.id)
      expect(ids).not.toContain(giftB.id)

      const physical = body.data.find((gift: { id: string }) => gift.id === giftPhysicalA.id)
      expect(physical).toEqual({
        id: giftPhysicalA.id,
        title: 'Jogo de Panelas',
        description: 'Panelas antiaderentes',
        priceCents: 45000,
        imageUrl: 'https://example.com/panelas.jpg',
        categoryId: categoryA.id,
        categoryName: 'Cozinha',
        isGroupGift: false,
        quantityAvailable: 3,
        targetAmountCents: null,
        quotaAmountCents: null,
        displayStyle: 'padrao',
        emotionalIcon: null,
        collectedAmountCents: null,
        hasPixOption: true,
        physicalDeliveryMode: 'ambos',
      })
    })

    it('presente de cota soma as contribuições em collectedAmountCents, mas nunca expõe quem contribuiu/reservou', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/gifts`)
      const body = await res.json()

      const group = body.data.find((gift: { id: string }) => gift.id === giftGroupA.id)
      expect(group.isGroupGift).toBe(true)
      expect(group.collectedAmountCents).toBe(30000)
      expect(Object.keys(group).sort()).toEqual(Object.keys(body.data[0]).sort())

      const raw = JSON.stringify(body)
      expect(raw).not.toContain('Presenteador Sigiloso')
      expect(raw).not.toContain('Contribuinte Sigiloso')
      expect(raw).not.toContain('nome_contribuinte')
      expect(raw).not.toContain('telefone_presenteador')
      expect(raw).not.toContain('reservado_em')
      expect(raw).not.toContain('convidado_id')
      expect(raw).not.toContain('convite_id')
    })

    it('slug inexistente retorna 404 limpo', async () => {
      const client = createTestApiClient()
      const res = await client.get('/api/public/slug-que-nao-existe-em-nenhum-lugar/gifts')
      expect(res.status).toBe(404)
    })
  })
})
