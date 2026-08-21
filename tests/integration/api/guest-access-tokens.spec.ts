import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestAccessToken } from '../../factories/access-token'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio para geração/revogação de credencial de
 * acesso do convidado (CLAUDE.md, seção 11/14.5) — o código em texto plano só
 * existe na resposta desta chamada, nunca é persistido nem recuperável
 * depois. Bate via HTTP real no servidor de build
 * (tests/integration/global-setup.ts), com uma sessão administrativa real
 * (tests/integration/helpers/admin-session.ts).
 */
describe('api: /api/guest-access-tokens', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string
  let invite: Awaited<ReturnType<typeof createTestInvite>>

  // Segundo casamento/membro/convite só para o caso de isolamento entre
  // tenants (gerar token para convite de outro casamento).
  let otherWedding: Awaited<ReturnType<typeof createTestWedding>>
  let otherMember: Awaited<ReturnType<typeof createTestMember>>
  let otherInvite: Awaited<ReturnType<typeof createTestInvite>>

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
    invite = await createTestInvite(admin, wedding.id)

    otherWedding = await createTestWedding(admin)
    otherMember = await createTestMember(admin, otherWedding.id)
    otherInvite = await createTestInvite(admin, otherWedding.id)
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

  describe('POST /api/guest-access-tokens', () => {
    it('caminho feliz: gera um token de acesso para o convite, código em texto plano só nesta resposta', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/guest-access-tokens', { conviteId: invite.id })
      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body.inviteId).toBe(invite.id)
      expect(typeof body.code).toBe('string')
      expect(body.code.length).toBeGreaterThan(0)

      const { data: stored } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('id', body.id)
        .single()
      expect(stored?.casamento_id).toBe(wedding.id)
      expect(stored?.convite_id).toBe(invite.id)
      expect(stored?.revogado_em).toBeNull()
      // O hash nunca é igual ao código em texto plano (CLAUDE.md, seção 11).
      expect(stored?.codigo_hash).not.toBe(body.code)
    })

    it('gerar um segundo token para o MESMO convite revoga o anterior automaticamente (só 1 ativo por convite)', async () => {
      const dedicatedInvite = await createTestInvite(admin, wedding.id, { nome: 'Convite Para Rotação de Token' })

      const client = createTestApiClient({ cookie })
      const firstRes = await client.post('/api/guest-access-tokens', { conviteId: dedicatedInvite.id })
      expect(firstRes.status).toBe(201)
      const first = await firstRes.json()

      const secondRes = await client.post('/api/guest-access-tokens', { conviteId: dedicatedInvite.id })
      expect(secondRes.status).toBe(201)
      const second = await secondRes.json()

      expect(second.id).not.toBe(first.id)

      const { data: firstStored } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('id', first.id)
        .single()
      expect(firstStored?.revogado_em).not.toBeNull()

      const { data: secondStored } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('id', second.id)
        .single()
      expect(secondStored?.revogado_em).toBeNull()
    })

    it('erro de domínio: convite inexistente retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/guest-access-tokens', {
        conviteId: '00000000-0000-0000-0000-000000000000',
      })
      expect(res.status).toBe(404)
    })

    it('isolamento: convite de OUTRO casamento retorna 404, nenhum token é criado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/guest-access-tokens', { conviteId: otherInvite.id })
      expect(res.status).toBe(404)

      const { count } = await admin
        .from('credenciais_acesso_convite')
        .select('*', { count: 'exact', head: true })
        .eq('convite_id', otherInvite.id)
      expect(count).toBe(0)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/guest-access-tokens', { conviteId: invite.id })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/guest-access-tokens/[id]/revoke', () => {
    it('caminho feliz: revoga um token ativo (revogado_em preenchido)', async () => {
      const dedicatedInvite = await createTestInvite(admin, wedding.id, { nome: 'Convite Para Revogar' })
      const { plainCode: _plainCode } = await createTestAccessToken(admin, wedding.id, dedicatedInvite.id)
      const { data: token } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('convite_id', dedicatedInvite.id)
        .single()
      if (!token) throw new Error('Token de teste não encontrado logo após a criação.')

      const client = createTestApiClient({ cookie })
      const res = await client.post(`/api/guest-access-tokens/${token.id}/revoke`, {})
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.id).toBe(token.id)

      const { data: stored } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('id', token.id)
        .single()
      expect(stored?.revogado_em).not.toBeNull()
    })

    it('erro de domínio: revogar um token já revogado retorna 404', async () => {
      const dedicatedInvite = await createTestInvite(admin, wedding.id, { nome: 'Convite Já Revogado' })
      await createTestAccessToken(admin, wedding.id, dedicatedInvite.id)
      const { data: token } = await admin
        .from('credenciais_acesso_convite')
        .select('*')
        .eq('convite_id', dedicatedInvite.id)
        .single()
      if (!token) throw new Error('Token de teste não encontrado logo após a criação.')

      const client = createTestApiClient({ cookie })
      const firstRevoke = await client.post(`/api/guest-access-tokens/${token.id}/revoke`, {})
      expect(firstRevoke.status).toBe(200)

      const secondRevoke = await client.post(`/api/guest-access-tokens/${token.id}/revoke`, {})
      expect(secondRevoke.status).toBe(404)
    })

    it('erro de domínio: revogar um token inexistente retorna 404', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/guest-access-tokens/00000000-0000-0000-0000-000000000000/revoke', {})
      expect(res.status).toBe(404)
    })
  })
})
