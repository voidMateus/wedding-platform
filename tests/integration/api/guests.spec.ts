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
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Cobre PUT /api/guests/party, PATCH /api/guests/party/reorder e
 * DELETE /api/guests/[id].
 */
describe('api: PUT /api/guests/party', () => {
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

  it('caminho feliz: cria o convidado principal escopado ao próprio casamento do usuário autenticado', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Fulano da Silva' },
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.primaryGuestId).toBeTruthy()

    const { data: stored } = await admin.from('convidados').select('*').eq('id', body.primaryGuestId).single()
    expect(stored?.casamento_id).toBe(wedding.id)
    expect(stored?.nome_completo).toBe('Fulano da Silva')
  })

  it('erro de domínio: nomeCompleto vazio é rejeitado com 400, nenhuma linha é criada', async () => {
    const client = createTestApiClient({ cookie })
    const { count: before } = await admin
      .from('convidados')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)

    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: '' },
    })
    expect(res.status).toBe(400)

    const { count: after } = await admin
      .from('convidados')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)
    expect(after).toBe(before)
  })

  it('erro de domínio: valor inválido de sexo é rejeitado com 400', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Fulano Inválido', sexo: 'invalido' },
    })
    expect(res.status).toBe(400)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.put('/api/guests/party', { primary: { nomeCompleto: 'Sem Sessão' } })
    expect(res.status).toBe(401)
  })
})

describe('api: PATCH /api/guests/party/reorder', () => {
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

  /**
   * O endpoint não passa por sincronizar_nucleo_convidado — cria o núcleo e
   * os convidados membros direto via service_role, exatamente como o
   * schema real exige (nucleos_acompanhantes + convidados.nucleo_id/ordem_nucleo).
   */
  async function createTestParty(casamentoId: string, memberCount: number) {
    const { data: party, error } = await admin
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: casamentoId })
      .select()
      .single()
    if (error || !party) throw new Error(`Falha ao criar núcleo de teste: ${error?.message}`)

    const members = []
    for (let i = 0; i < memberCount; i += 1) {
      members.push(
        await createTestGuest(admin, casamentoId, {
          nome_completo: `Membro ${i}`,
          nucleo_id: party.id,
          ordem_nucleo: i,
        }),
      )
    }
    return { party, members }
  }

  it('caminho feliz: reordena os membros do núcleo e a nova ordem persiste', async () => {
    const { party, members } = await createTestParty(wedding.id, 3)
    const [first, second, third] = members
    const client = createTestApiClient({ cookie })

    const res = await client.patch('/api/guests/party/reorder', {
      partyId: party.id,
      orderedGuestIds: [third!.id, first!.id, second!.id],
    })
    expect(res.status).toBe(200)

    const { data: stored } = await admin
      .from('convidados')
      .select('id, ordem_nucleo')
      .eq('nucleo_id', party.id)
      .order('ordem_nucleo', { ascending: true })

    expect(stored?.map((g) => g.id)).toEqual([third!.id, first!.id, second!.id])
  })

  it('erro de domínio: reordenar um núcleo de outro casamento não altera nenhum dado (isolamento por casamento_id)', async () => {
    const otherWedding = await createTestWedding(admin)
    try {
      const { party, members } = await createTestParty(otherWedding.id, 2)
      const [first, second] = members
      const originalOrder = [first!.id, second!.id]

      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/guests/party/reorder', {
        partyId: party.id,
        orderedGuestIds: [second!.id, first!.id],
      })

      // O endpoint escopa a query de membros por casamento_id do usuário
      // autenticado — um núcleo de outro casamento não tem nenhum membro
      // visível, então a reordenação não encontra nada para alterar. O
      // ponto do teste é confirmar que a ordem do outro casamento
      // permanece intacta (nenhum vazamento cross-tenant), não um código
      // HTTP específico.
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.orderedGuestIds).toEqual([])

      const { data: stored } = await admin
        .from('convidados')
        .select('id, ordem_nucleo')
        .eq('nucleo_id', party.id)
        .order('ordem_nucleo', { ascending: true })
      expect(stored?.map((g) => g.id)).toEqual(originalOrder)
    } finally {
      await deleteTestWedding(admin, otherWedding.id)
    }
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.patch('/api/guests/party/reorder', {
      partyId: '00000000-0000-0000-0000-000000000000',
      orderedGuestIds: ['00000000-0000-0000-0000-000000000001'],
    })
    expect(res.status).toBe(401)
  })
})

describe('api: DELETE /api/guests/[id]', () => {
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

  it('caminho feliz: soft-deleta o convidado (excluido_em preenchido, linha não removida)', async () => {
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const res = await client.del(`/api/guests/${guest.id}`)
    expect(res.status).toBe(200)

    const { data: stored } = await admin.from('convidados').select('*').eq('id', guest.id).single()
    expect(stored?.excluido_em).not.toBeNull()
  })

  it('erro de domínio: excluir um id inexistente retorna 404', async () => {
    const res = await createTestApiClient({ cookie }).del('/api/guests/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient()
    const res = await client.del(`/api/guests/${guest.id}`)
    expect(res.status).toBe(401)
  })
})
