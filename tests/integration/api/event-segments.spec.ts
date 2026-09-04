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
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  describe('POST /api/event-segments', () => {
    it('caminho feliz: cria o item do cronograma escopado ao próprio casamento do usuário autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', { titulo: 'Cerimônia' })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.titulo).toBe('Cerimônia')
      expect(body.casamento_id).toBe(wedding.id)

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', body.id)
        .single()
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

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', segment.id)
        .single()
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

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', segment.id)
        .single()
      expect(stored?.mesmo_local_que).toBeNull()
    })
  })

  describe('DELETE /api/event-segments/[id]', () => {
    it('caminho feliz: exclusão física — a linha deixa de existir (etapas_evento não tem soft delete)', async () => {
      const segment = await createTestEventSegment(admin, wedding.id, { titulo: 'Para Excluir' })

      const client = createTestApiClient({ cookie })
      const res = await client.del(`/api/event-segments/${segment.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', segment.id)
        .maybeSingle()
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

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', original.id)
        .maybeSingle()
      expect(stored).not.toBeNull()
    })
  })

  describe('localização do local (CLAUDE.md, seção 12)', () => {
    const localDoMaps = {
      titulo: 'Cerimônia',
      nomeLocal: 'Buffet Exemplo',
      enderecoLocal: 'Av. Miguel Sutil, 1234 - Cuiabá, MT',
      latitudeLocal: -15.601398,
      longitudeLocal: -56.097892,
      origemLocal: 'maps_place',
      placeIdLocal: 'ChIJ-teste',
      provedorLocal: 'google',
      urlMapaLocal: 'https://maps.google.com/?cid=99',
      cidadeLocal: 'Cuiabá',
      estadoLocal: 'MT',
    }

    it('caminho feliz: grava a seleção do provedor com place_id, provedor e coordenadas', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', localDoMaps)
      expect(res.status).toBe(201)

      const body = await res.json()
      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', body.id)
        .single()
      expect(stored?.origem_local).toBe('maps_place')
      expect(stored?.place_id_local).toBe('ChIJ-teste')
      expect(stored?.provedor_local).toBe('google')
      expect(stored?.url_mapa_local).toBe('https://maps.google.com/?cid=99')
      expect(Number(stored?.latitude_local)).toBeCloseTo(-15.601398)
    })

    it('caminho feliz: local manual guarda as partes do endereço e nenhum place_id', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', {
        titulo: 'Recepção',
        nomeLocal: 'Chácara Recanto das Flores',
        enderecoLocal: 'Estrada da Guarita, km 8 · Chapada dos Guimarães - MT',
        origemLocal: 'manual',
        logradouroLocal: 'Estrada da Guarita, km 8',
        cidadeLocal: 'Chapada dos Guimarães',
        estadoLocal: 'MT',
        latitudeLocal: -15.4,
        longitudeLocal: -55.7,
      })
      expect(res.status).toBe(201)

      const body = await res.json()
      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', body.id)
        .single()
      expect(stored?.origem_local).toBe('manual')
      expect(stored?.place_id_local).toBeNull()
      expect(stored?.provedor_local).toBeNull()
      expect(stored?.logradouro_local).toBe('Estrada da Guarita, km 8')
    })

    it('erro de domínio: place_id sem a origem correspondente é rejeitado com 400', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', {
        ...localDoMaps,
        origemLocal: 'manual',
      })
      expect(res.status).toBe(400)
    })

    it('erro de domínio: URL de mapa de host arbitrário é rejeitada com 400', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/event-segments', {
        ...localDoMaps,
        urlMapaLocal: 'https://phishing.example.com/maps',
      })
      expect(res.status).toBe(400)
    })

    it('mesmoLocalQue zera TODAS as colunas de local, inclusive place_id e URL', async () => {
      const ceremony = await createTestEventSegment(admin, wedding.id, { titulo: 'Cerimônia' })
      const reception = await createTestEventSegment(admin, wedding.id, {
        titulo: 'Recepção',
        nome_local: 'Local antigo',
        origem_local: 'maps_place',
        place_id_local: 'ChIJ-antigo',
        provedor_local: 'google',
        url_mapa_local: 'https://maps.google.com/?cid=1',
        latitude_local: -15.1,
        longitude_local: -56.1,
        logradouro_local: 'Rua Antiga',
      })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/event-segments/${reception.id}`, {
        titulo: 'Recepção',
        mesmoLocalQue: ceremony.id,
      })
      expect(res.status).toBe(200)

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', reception.id)
        .single()
      expect(stored?.mesmo_local_que).toBe(ceremony.id)
      expect(stored?.nome_local).toBeNull()
      expect(stored?.place_id_local).toBeNull()
      expect(stored?.provedor_local).toBeNull()
      expect(stored?.url_mapa_local).toBeNull()
      expect(stored?.latitude_local).toBeNull()
      expect(stored?.logradouro_local).toBeNull()
    })

    it('compatibilidade: linha legada só com endereço em texto continua sendo aceita', async () => {
      const legado = await createTestEventSegment(admin, wedding.id, {
        titulo: 'Cerimônia',
        endereco_local: 'Rua das Flores, 100',
      })

      const client = createTestApiClient({ cookie })
      const res = await client.patch(`/api/event-segments/${legado.id}`, {
        titulo: 'Cerimônia',
        enderecoLocal: 'Rua das Flores, 100',
        iniciaEm: '2027-05-16T16:00',
      })
      expect(res.status).toBe(200)

      const { data: stored } = await admin
        .from('etapas_evento')
        .select('*')
        .eq('id', legado.id)
        .single()
      expect(stored?.endereco_local).toBe('Rua das Flores, 100')
      expect(stored?.origem_local).toBeNull()
    })
  })
})
