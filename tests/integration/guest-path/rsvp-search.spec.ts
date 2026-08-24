import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestInvite } from '../../factories/invite'
import { createTestGuest } from '../../factories/guest'
import { maskName } from '../../../server/utils/mask-name'

/**
 * Caminho do convidado — busca pública por nome, sem código/token
 * (CLAUDE.md, seção 12.1): GET /api/public/[slug]/rsvp-search (busca
 * tolerante por nome) -> POST /api/public/rsvp-search/select (confirmação
 * leve) -> POST /api/public/rsvp-search/confirm (confirmação total, emite
 * sessão). RLS não protege nada aqui (service_role) — a garantia é
 * inteiramente do código de cada handler.
 *
 * Achado ao ler o código-fonte (não presumido): o mascaramento de nome
 * (server/utils/mask-name.ts) NÃO é aplicado ao próprio resultado da busca
 * (server/api/public/[slug]/rsvp-search.get.ts retorna `fullName` = nome
 * completo real do convidado buscado, sem máscara — é assim que o convidado
 * reconhece o próprio nome na lista). A máscara só entra no passo seguinte
 * (select.post.ts), sobre os NOMES DE TERCEIROS do mesmo convite (família/
 * acompanhantes que não foram buscados), para reduzir clique errado sem
 * expor a identidade completa de quem não fez a busca. Os testes abaixo
 * verificam exatamente essa distinção.
 */
describe('guest-path: busca pública por nome (/api/public/rsvp-search)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let inviteB: Awaited<ReturnType<typeof createTestInvite>>
  let guestA: Awaited<ReturnType<typeof createTestGuest>>
  let companionA: Awaited<ReturnType<typeof createTestGuest>>
  let guestWithoutInvite: Awaited<ReturnType<typeof createTestGuest>>
  let guestB: Awaited<ReturnType<typeof createTestGuest>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    inviteA = await createTestInvite(admin, weddingA.id)
    inviteB = await createTestInvite(admin, weddingB.id)

    guestA = await createTestGuest(admin, weddingA.id, {
      convite_id: inviteA.id,
      nome_completo: 'Fernanda Souza Lima',
    })
    companionA = await createTestGuest(admin, weddingA.id, {
      convite_id: inviteA.id,
      nome_completo: 'Ricardo Souza Lima',
    })
    // Mesmo nome de guestA, mas sem convite ainda vinculado — nunca deve
    // aparecer na busca (nada para confirmar).
    guestWithoutInvite = await createTestGuest(admin, weddingA.id, {
      nome_completo: 'Fernanda Souza Lima',
    })
    // Mesmo nome, mas em OUTRO casamento — nunca deve vazar pela busca de weddingA.
    guestB = await createTestGuest(admin, weddingB.id, {
      convite_id: inviteB.id,
      nome_completo: 'Fernanda Souza Lima',
    })
  })

  afterAll(async () => {
    await cleanupAll([() => deleteTestWedding(admin, weddingA.id), () => deleteTestWedding(admin, weddingB.id)])
  })

  describe('GET /api/public/[slug]/rsvp-search', () => {
    it('nome real com convite: aparece na busca com o nome completo (sem máscara), nunca o de outro casamento ou sem convite', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/rsvp-search?q=Fernanda Souza`)
      expect(res.status).toBe(200)

      const body = await res.json()
      const ids: string[] = body.data.map((r: { guestId: string }) => r.guestId)
      expect(ids).toContain(guestA.id)
      expect(ids).not.toContain(guestWithoutInvite.id)
      expect(ids).not.toContain(guestB.id)

      const found = body.data.find((r: { guestId: string }) => r.guestId === guestA.id)
      expect(found.fullName).toBe('Fernanda Souza Lima')
    })

    it('busca tolerante: bate por parte do nome, sem acento e sem diferenciar maiúsculas', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/rsvp-search?q=fernanda`)
      expect(res.status).toBe(200)

      const body = await res.json()
      const ids: string[] = body.data.map((r: { guestId: string }) => r.guestId)
      expect(ids).toContain(guestA.id)
    })

    it('nome que não existe neste casamento retorna lista vazia, nunca erro', async () => {
      const client = createTestApiClient()
      const res = await client.get(`/api/public/${weddingA.slug}/rsvp-search?q=Zzznaoexiste`)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it('slug de casamento inexistente retorna 404 limpo', async () => {
      const client = createTestApiClient()
      const res = await client.get('/api/public/slug-que-nao-existe-em-nenhum-lugar/rsvp-search?q=Fernanda')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/public/rsvp-search/select', () => {
    it('mascara o nome dos DEMAIS membros do mesmo convite, nunca o próprio guestId buscado', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/public/rsvp-search/select', { guestId: guestA.id })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.guestId).toBe(guestA.id)
      expect(body.maskedNames).toEqual([maskName('Ricardo Souza Lima')])
      expect(body.maskedNames).not.toContain('Ricardo Souza Lima')
    })

    it('guestId inexistente retorna 404', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/public/rsvp-search/select', {
        guestId: '00000000-0000-0000-0000-000000000000',
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/public/rsvp-search/confirm', () => {
    it('confirma o convidado certo, emite sessão de RSVP e retorna o payload completo do convite (mesmo shape de /api/rsvp/[code])', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/public/rsvp-search/confirm', { guestId: guestA.id })
      expect(res.status).toBe(200)
      expect(res.headers.get('set-cookie')).toMatch(/rsvp_session=/)

      const body = await res.json()
      expect(body.inviteId).toBe(inviteA.id)
      const memberIds: string[] = body.members.map((m: { guestId: string }) => m.guestId)
      expect(memberIds).toContain(guestA.id)
      expect(memberIds).toContain(companionA.id)
    })

    it('guestId inexistente retorna 404, sem emitir sessão', async () => {
      const client = createTestApiClient()
      const res = await client.post('/api/public/rsvp-search/confirm', {
        guestId: '00000000-0000-0000-0000-000000000000',
      })
      expect(res.status).toBe(404)
      expect(res.headers.get('set-cookie')).toBeNull()
    })
  })

  describe('rate limiting da busca por nome (mais restritivo que o resto do caminho do convidado)', () => {
    /**
     * Achado de bug real de segurança (Passo 2, docs/PLANO-SAAS.md), já
     * corrigido em server/utils/rate-limit-path.ts: `classifyRateLimitPath`
     * casava `RSVP_SEARCH_PATH` contra `event.path`, que em h3 inclui a
     * query string inteira (ex.: "/api/public/joao/rsvp-search?q=ana" — não
     * só o pathname). O regex terminava em `$` logo depois de "rsvp-search",
     * então nunca casava quando existia "?q=..." — e este endpoint GET
     * sempre carrega esse parâmetro (é o único jeito de buscar por nome).
     * Resultado real (confirmado rodando contra o servidor de verdade antes
     * da correção): `server/middleware/rate-limit.ts` recebia `kind ===
     * null` e devolvia cedo, pulando o rate limit por completo — nenhum
     * header `X-RateLimit-*`, nenhum 429, em nenhuma quantidade de
     * tentativas. Corrigido removendo a query string antes de testar os
     * regexes (não os regexes em si). O teste abaixo prova o comportamento
     * correto agora em vigor — se essa correção regredir, ele volta a falhar.
     */
    it('aplica o rate limit no GET com query string — 429 ao ultrapassar o orçamento, mesmo header presente', async () => {
      const client = createTestApiClient()
      const attempts = 14 // bem acima de RSVP_SEARCH_LIMIT = 10 (server/utils/rate-limit.ts)
      const statuses: number[] = []
      let sawRateLimitHeader = false

      for (let i = 0; i < attempts; i++) {
        const res = await client.get(`/api/public/${weddingA.slug}/rsvp-search?q=Fernanda`)
        statuses.push(res.status)
        if (res.headers.get('x-ratelimit-limit')) sawRateLimitHeader = true
      }

      expect(sawRateLimitHeader).toBe(true)
      expect(statuses).toContain(429)
    })

    it('controle: o mesmo orçamento (10/60s) funciona normalmente em select/confirm — POST, sem query string na URL', async () => {
      const client = createTestApiClient()
      const attempts = 14
      const statuses: number[] = []
      let sawRateLimitHeader = false

      for (let i = 0; i < attempts; i++) {
        const res = await client.post('/api/public/rsvp-search/select', { guestId: guestA.id })
        statuses.push(res.status)
        if (res.headers.get('x-ratelimit-limit')) sawRateLimitHeader = true
      }

      expect(sawRateLimitHeader).toBe(true)
      expect(statuses).toContain(429)
    })
  })
})
