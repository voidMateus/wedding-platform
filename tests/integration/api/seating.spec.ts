import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'
import { createTestInvite } from '../../factories/invite'

/**
 * Integração — Mesas (Fase 2 do Hub).
 *
 * O que este bloco protege são as DECISÕES, não o CRUD: capacidade excedida
 * não bloqueia, quem recusou continua sentado mas sai de "falta acomodar",
 * rascunho não senta, e sentar é sempre em lote.
 */
describe('api: mesas e assentos', () => {
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

  async function criarMesa(nome: string, capacidade = 8): Promise<string> {
    const res = await createTestApiClient({ cookie }).post('/api/seating/tables', {
      nome,
      capacidade,
      formato: 'redonda',
      larguraCm: 180,
      profundidadeCm: 180,
    })
    const body = await res.json()
    return body.id
  }

  it('caminho feliz: cria a mesa escopada ao casamento do usuário', async () => {
    const id = await criarMesa('Mesa A')

    const { data } = await admin.from('mesas').select('*').eq('id', id).single()
    expect(data?.casamento_id).toBe(wedding.id)
    expect(data?.capacidade).toBe(8)
  })

  // Mesa nova não pode nascer empilhada sobre a anterior: com doze criadas em
  // sequência, o casal teria que arrastar uma a uma só para ver que existem.
  it('mesas novas nascem em posições diferentes', async () => {
    const primeira = await criarMesa('Grade 1')
    const segunda = await criarMesa('Grade 2')

    const { data } = await admin
      .from('mesas')
      .select('id, posicao_x_cm, posicao_y_cm')
      .in('id', [primeira, segunda])

    const posicoes = (data ?? []).map((m) => `${m.posicao_x_cm}:${m.posicao_y_cm}`)
    expect(new Set(posicoes).size).toBe(2)
  })

  it('erro de domínio: nome repetido é recusado com 400 e mensagem própria', async () => {
    await criarMesa('Repetida')
    const res = await createTestApiClient({ cookie }).post('/api/seating/tables', {
      nome: 'repetida',
      capacidade: 4,
      formato: 'redonda',
      larguraCm: 180,
      profundidadeCm: 180,
    })

    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain('Já existe uma mesa')
  })

  it('erro de domínio: mesa redonda com medidas diferentes é recusada com 400', async () => {
    const res = await createTestApiClient({ cookie }).post('/api/seating/tables', {
      nome: 'Oval impossível',
      capacidade: 8,
      formato: 'redonda',
      larguraCm: 180,
      profundidadeCm: 90,
    })
    expect(res.status).toBe(400)
  })

  it('senta em lote e a ocupação aparece no resumo', async () => {
    const mesaId = await criarMesa('Mesa da família')
    const a = await createTestGuest(admin, wedding.id)
    const b = await createTestGuest(admin, wedding.id)

    const res = await createTestApiClient({ cookie }).post('/api/seating/assign', {
      mesaId,
      convidadoIds: [a.id, b.id],
    })
    expect(res.status).toBe(200)
    expect((await res.json()).atualizados).toBe(2)

    const seating = await (await createTestApiClient({ cookie }).get('/api/seating')).json()
    const mesa = seating.mesas.find((m: { id: string }) => m.id === mesaId)
    expect(mesa.resumo.ocupacao).toBe(2)
    expect(mesa.resumo.livres).toBe(6)
  })

  it('`mesaId: null` é o tirar da mesa — mesma rota, mesma mutação', async () => {
    const mesaId = await criarMesa('Mesa que esvazia')
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    await client.post('/api/seating/assign', { mesaId, convidadoIds: [guest.id] })
    await client.post('/api/seating/assign', { mesaId: null, convidadoIds: [guest.id] })

    const { data } = await admin.from('convidados').select('mesa_id').eq('id', guest.id).single()
    expect(data?.mesa_id).toBeNull()
  })

  // Estado real do planejamento ("depois eu resolvo"): o produto que recusa
  // gravar isso obriga o casal a sair dele para pensar.
  it('capacidade excedida é aceita e sinalizada, nunca bloqueada', async () => {
    const mesaId = await criarMesa('Apertada', 2)
    const pessoas = await Promise.all([
      createTestGuest(admin, wedding.id),
      createTestGuest(admin, wedding.id),
      createTestGuest(admin, wedding.id),
    ])

    const res = await createTestApiClient({ cookie }).post('/api/seating/assign', {
      mesaId,
      convidadoIds: pessoas.map((p) => p.id),
    })
    expect(res.status).toBe(200)

    const seating = await (await createTestApiClient({ cookie }).get('/api/seating')).json()
    const mesa = seating.mesas.find((m: { id: string }) => m.id === mesaId)
    expect(mesa.resumo.excedente).toBe(1)
    expect(mesa.resumo.livres).toBe(0)
  })

  it('rascunho da lista não senta: 400 com a frase que diz o que fazer', async () => {
    const mesaId = await criarMesa('Mesa sem rascunho')
    const rascunho = await createTestGuest(admin, wedding.id, { em_consideracao: true })

    const res = await createTestApiClient({ cookie }).post('/api/seating/assign', {
      mesaId,
      convidadoIds: [rascunho.id],
    })

    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain('em consideração')
  })

  it('erro de domínio: mesa de outro casamento responde 404', async () => {
    const outro = await createTestWedding(admin)
    try {
      const { data: mesaAlheia } = await admin
        .from('mesas')
        .insert({ casamento_id: outro.id, nome: 'Alheia', capacidade: 8 })
        .select('id')
        .single()
      const guest = await createTestGuest(admin, wedding.id)

      const res = await createTestApiClient({ cookie }).post('/api/seating/assign', {
        mesaId: mesaAlheia!.id,
        convidadoIds: [guest.id],
      })
      expect(res.status).toBe(404)
    } finally {
      await deleteTestWedding(admin, outro.id)
    }
  })

  it('erro de domínio: assento sem ninguém é rejeitado com 400', async () => {
    const mesaId = await criarMesa('Mesa vazia')
    const res = await createTestApiClient({ cookie }).post('/api/seating/assign', {
      mesaId,
      convidadoIds: [],
      avulsoIds: [],
    })
    expect(res.status).toBe(400)
  })

  it('excluir a mesa devolve os ocupantes à fila, sem excluir ninguém', async () => {
    const mesaId = await criarMesa('Mesa efêmera')
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    await client.post('/api/seating/assign', { mesaId, convidadoIds: [guest.id] })
    const res = await client.del(`/api/seating/tables/${mesaId}`)
    expect(res.status).toBe(200)

    const { data } = await admin
      .from('convidados')
      .select('id, mesa_id, excluido_em')
      .eq('id', guest.id)
      .single()
    expect(data?.mesa_id).toBeNull()
    expect(data?.excluido_em).toBeNull()
  })

  // Quem recusou continua sentado (a resposta ainda pode mudar) mas sai da
  // fila: não há o que acomodar para quem já disse que não vai.
  it('quem recusou sai de "falta acomodar" sem sair da mesa', async () => {
    const mesaId = await criarMesa('Mesa com desistência')
    const invite = await createTestInvite(admin, wedding.id, { nome: 'Convite da desistência' })
    const guest = await createTestGuest(admin, wedding.id, { convite_id: invite.id })
    const client = createTestApiClient({ cookie })

    await client.post('/api/seating/assign', { mesaId, convidadoIds: [guest.id] })

    // `convite_id` é obrigatório em `respostas_rsvp`, e o erro do insert É
    // conferido: sem isto o setup falhava em silêncio e o teste passava a
    // afirmar que ninguém tinha recusado — verdade, mas por acidente.
    const { error } = await admin.from('respostas_rsvp').insert({
      casamento_id: wedding.id,
      convite_id: invite.id,
      convidado_id: guest.id,
      status_rsvp: 'recusado',
    })
    expect(error).toBeNull()

    const seating = await (await client.get('/api/seating')).json()
    const mesa = seating.mesas.find((m: { id: string }) => m.id === mesaId)

    expect(mesa.resumo.ocupacao).toBe(1)
    expect(mesa.resumo.naoVao).toBe(1)
    expect(seating.semMesa.some((p: { id: string }) => p.id === guest.id)).toBe(false)
  })

  it('a planta sem medidas se ajusta ao conteúdo, e com medidas usa as do salão', async () => {
    const client = createTestApiClient({ cookie })

    const semMedidas = await (await client.get('/api/seating')).json()
    expect(semMedidas.salao.definida).toBe(false)

    await client.patch('/api/seating/floorplan', { larguraCm: 2000, profundidadeCm: 1500 })

    const comMedidas = await (await client.get('/api/seating')).json()
    expect(comMedidas.salao.definida).toBe(true)
    expect(comMedidas.salao.areaLarguraCm).toBe(2000)
  })

  it('sem sessão nenhuma, criar mesa é rejeitado com 401', async () => {
    const res = await createTestApiClient().post('/api/seating/tables', {
      nome: 'Sem sessão',
      capacidade: 8,
      formato: 'redonda',
      larguraCm: 180,
      profundidadeCm: 180,
    })
    expect(res.status).toBe(401)
  })
})
