import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação, cobrindo o ciclo
 * de vida completo do convite. Bate via HTTP real no servidor de build
 * (tests/integration/global-setup.ts), com uma sessão administrativa real
 * (tests/integration/helpers/admin-session.ts).
 */
describe('api: /api/invites', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  // Segundo casamento/membro só para o caso de isolamento entre tenants
  // (PATCH cross-wedding e vínculo de convidado de outro casamento).
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

  describe('POST /api/invites', () => {
    it('caminho feliz: cria o convite escopado ao próprio casamento do usuário autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/invites', { nome: 'Família da Noiva' })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.nome).toBe('Família da Noiva')
      expect(body.casamento_id).toBe(wedding.id)
      expect(body.codigo_interno).toMatch(/^CONV-/)

      const { data: stored } = await admin.from('convites').select('*').eq('id', body.id).single()
      expect(stored?.casamento_id).toBe(wedding.id)
    })

    it('erro de domínio: nome vazio é rejeitado com 400, nenhuma linha é criada', async () => {
      const client = createTestApiClient({ cookie })
      const { count: before } = await admin
        .from('convites')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)

      const res = await client.post('/api/invites', { nome: '' })
      expect(res.status).toBe(400)

      const { count: after } = await admin
        .from('convites')
        .select('*', { count: 'exact', head: true })
        .eq('casamento_id', wedding.id)
      expect(after).toBe(before)
    })
  })

  describe('PATCH /api/invites/[id]', () => {
    it('caminho feliz: atualiza nome/observações do convite', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Original' })
      const created = await createRes.json()

      const res = await client.patch(`/api/invites/${created.id}`, {
        nome: 'Convite Atualizado',
        observacoes: 'Chegam de van.',
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.nome).toBe('Convite Atualizado')
      expect(body.observacoes).toBe('Chegam de van.')

      const { data: stored } = await admin.from('convites').select('*').eq('id', created.id).single()
      expect(stored?.nome).toBe('Convite Atualizado')
      expect(stored?.observacoes).toBe('Chegam de van.')
    })

    it('isolamento: membro de OUTRO casamento não consegue editar este convite (404, linha inalterada)', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Isolado' })
      const created = await createRes.json()

      const otherClient = createTestApiClient({ cookie: otherCookie })
      const res = await otherClient.patch(`/api/invites/${created.id}`, { nome: 'Sequestrado' })
      expect(res.status).toBe(404)

      const { data: stored } = await admin.from('convites').select('*').eq('id', created.id).single()
      expect(stored?.nome).toBe('Convite Isolado')
    })
  })

  describe('DELETE /api/invites/[id]', () => {
    it('caminho feliz: soft-delete — excluido_em é preenchido, a linha permanece', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Para Excluir' })
      const created = await createRes.json()

      const res = await client.del(`/api/invites/${created.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('convites').select('*').eq('id', created.id).single()
      expect(stored).not.toBeNull()
      expect(stored?.excluido_em).not.toBeNull()
    })

    it('domínio: excluir um convite inexistente retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.del('/api/invites/00000000-0000-0000-0000-000000000000')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/invites/[id]/archive', () => {
    it('caminho feliz: arquiva o convite (arquivado_em preenchido)', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Para Arquivar' })
      const created = await createRes.json()

      const res = await client.post(`/api/invites/${created.id}/archive`, { archived: true })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.arquivado_em).not.toBeNull()

      const { data: stored } = await admin.from('convites').select('*').eq('id', created.id).single()
      expect(stored?.arquivado_em).not.toBeNull()
    })

    it('chamar de novo com archived=true é idempotente (continua arquivado, sem erro)', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Duplo Arquivamento' })
      const created = await createRes.json()

      await client.post(`/api/invites/${created.id}/archive`, { archived: true })
      const res = await client.post(`/api/invites/${created.id}/archive`, { archived: true })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.arquivado_em).not.toBeNull()
    })

    it('chamar com archived=false desarquiva (arquivado_em volta a null)', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Desarquivar' })
      const created = await createRes.json()

      await client.post(`/api/invites/${created.id}/archive`, { archived: true })
      const res = await client.post(`/api/invites/${created.id}/archive`, { archived: false })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.arquivado_em).toBeNull()
    })
  })

  describe('POST /api/invites/[id]/guests', () => {
    it('caminho feliz: vincula um convidado existente (sem convite ainda) a este convite', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Para Vincular' })
      const invite = await createRes.json()
      const guest = await createTestGuest(admin, wedding.id)
      expect(guest.convite_id).toBeNull()

      const res = await client.post(`/api/invites/${invite.id}/guests`, { guestIds: [guest.id] })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.addedGuestIds).toEqual([guest.id])

      const { data: stored } = await admin.from('convidados').select('*').eq('id', guest.id).single()
      expect(stored?.convite_id).toBe(invite.id)
    })

    it('domínio: convidado de OUTRO casamento nunca é cross-linkado a este convite', async () => {
      // O handler (server/api/invites/[id]/guests.post.ts) busca os
      // convidados sempre filtrando `.eq('casamento_id', weddingId)` do
      // convite — um guestId de outro casamento simplesmente não aparece no
      // resultado, então não é nem sinalizado como conflito nem vinculado
      // (o UPDATE também é escopado pelo mesmo casamento_id). A resposta HTTP
      // continua 200 (comportamento real, verificado abaixo) — a garantia
      // que realmente importa (CLAUDE.md, seção 4.2/12) é a invariante de
      // isolamento: a linha do convidado de outro tenant nunca é tocada.
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Alvo Cross-Tenant' })
      const invite = await createRes.json()
      const foreignGuest = await createTestGuest(admin, otherWedding.id)

      const res = await client.post(`/api/invites/${invite.id}/guests`, { guestIds: [foreignGuest.id] })
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('convidados').select('*').eq('id', foreignGuest.id).single()
      expect(stored?.convite_id).toBeNull()
    })
  })

  describe('DELETE /api/invites/[id]/guests/[guestId]', () => {
    it('caminho feliz: desvincula o convidado (convite_id vira null), convidado não é excluído', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Para Desvincular' })
      const invite = await createRes.json()
      const guest = await createTestGuest(admin, wedding.id, { convite_id: invite.id })

      const res = await client.del(`/api/invites/${invite.id}/guests/${guest.id}`)
      expect(res.status).toBe(200)

      const { data: stored } = await admin.from('convidados').select('*').eq('id', guest.id).single()
      expect(stored).not.toBeNull()
      expect(stored?.excluido_em).toBeNull()
      expect(stored?.convite_id).toBeNull()
    })

    it('domínio: desvincular um convidado que não pertence a este convite retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Sem Este Convidado' })
      const invite = await createRes.json()
      const unrelatedGuest = await createTestGuest(admin, wedding.id)

      const res = await client.del(`/api/invites/${invite.id}/guests/${unrelatedGuest.id}`)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/invites/[id]/send', () => {
    it('caminho feliz: marca o convite como enviado (status_convite/enviado_em) — não envia e-mail/SMS de verdade (Fase 2)', async () => {
      const client = createTestApiClient({ cookie })
      const createRes = await client.post('/api/invites', { nome: 'Convite Para Enviar' })
      const invite = await createRes.json()
      expect(invite.enviado_em).toBeNull()

      const res = await client.post(`/api/invites/${invite.id}/send`, {})
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status_convite).toBe('enviado')
      expect(body.enviado_em).not.toBeNull()

      const { data: stored } = await admin.from('convites').select('*').eq('id', invite.id).single()
      expect(stored?.status_convite).toBe('enviado')
      expect(stored?.enviado_em).not.toBeNull()
    })

    it('domínio: enviar um convite inexistente retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/invites/00000000-0000-0000-0000-000000000000/send', {})
      expect(res.status).toBe(404)
    })
  })
})
