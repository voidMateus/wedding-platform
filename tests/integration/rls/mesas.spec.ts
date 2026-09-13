import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'

/**
 * Isolamento entre tenants em `mesas` (docs/ARCHITECTURE.md, seção 9.1/9.2),
 * mais os dois invariantes que o BANCO garante — e que nenhum endpoint
 * precisa lembrar de checar:
 *
 * - **rascunho da lista nunca senta** (`convidados_em_consideracao_sem_mesa`),
 *   irmã da constraint que já o mantinha sem convite;
 * - **a mesa tem que ser do mesmo casamento da pessoa**
 *   (`convidados_verificar_mesa`), como já valia para convite, grupo e núcleo.
 */
describe('RLS: mesas', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let mesaA: { id: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)

    const { data, error } = await admin
      .from('mesas')
      .insert({ casamento_id: weddingA.id, nome: 'Mesa 1', capacidade: 8 })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Falha ao criar mesa de teste: ${error?.message}`)
    mesaA = data
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a mesa', async () => {
    const { data, error } = await memberA.client
      .from('mesas')
      .select('*')
      .eq('id', mesaA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(mesaA.id)
  })

  it('membro de outro casamento não lê a mesa', async () => {
    const { data } = await memberB.client.from('mesas').select('*').eq('id', mesaA.id).maybeSingle()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não move a mesa', async () => {
    await memberB.client.from('mesas').update({ posicao_x_cm: 500 }).eq('id', mesaA.id)

    const { data } = await admin.from('mesas').select('posicao_x_cm').eq('id', mesaA.id).single()
    expect(data?.posicao_x_cm).toBe(0)
  })

  it('membro de outro casamento não cria mesa no casamento A', async () => {
    const { error } = await memberB.client
      .from('mesas')
      .insert({ casamento_id: weddingA.id, nome: 'Invasora', capacidade: 4 })
      .select()

    expect(error).not.toBeNull()
  })

  // Nome repetido quebra o total mental do casal antes de quebrar código: duas
  // "Mesa 7" no mapa impresso mandam metade dos convidados para o lugar errado.
  it('nome de mesa é único por casamento', async () => {
    const { error } = await admin
      .from('mesas')
      .insert({ casamento_id: weddingA.id, nome: 'mesa 1', capacidade: 4 })

    expect(error?.code).toBe('23505')
  })

  it('mesa redonda com medidas diferentes é recusada pelo CHECK', async () => {
    const { error } = await admin.from('mesas').insert({
      casamento_id: weddingA.id,
      nome: 'Oval impossível',
      capacidade: 8,
      formato: 'redonda',
      largura_cm: 180,
      profundidade_cm: 90,
    })

    expect(error).not.toBeNull()
  })

  it('rascunho da lista não senta: a constraint recusa', async () => {
    const rascunho = await createTestGuest(admin, weddingA.id, { em_consideracao: true })

    const { error } = await admin
      .from('convidados')
      .update({ mesa_id: mesaA.id })
      .eq('id', rascunho.id)

    expect(error?.message).toContain('convidados_em_consideracao_sem_mesa')
  })

  it('convidado não senta em mesa de outro casamento', async () => {
    const convidadoB = await createTestGuest(admin, weddingB.id)

    const { error } = await admin
      .from('convidados')
      .update({ mesa_id: mesaA.id })
      .eq('id', convidadoB.id)

    expect(error?.message).toContain('outro casamento')
  })

  // `on delete set null` é o que torna a exclusão segura sem soft delete: o
  // banco devolve as pessoas à fila sozinho, sem estado fantasma.
  it('excluir a mesa devolve quem sentava nela para a fila', async () => {
    const { data: mesa } = await admin
      .from('mesas')
      .insert({ casamento_id: weddingA.id, nome: 'Temporária', capacidade: 4 })
      .select('id')
      .single()

    const convidado = await createTestGuest(admin, weddingA.id, { mesa_id: mesa!.id })

    await admin.from('mesas').delete().eq('id', mesa!.id)

    const { data: depois } = await admin
      .from('convidados')
      .select('id, mesa_id')
      .eq('id', convidado.id)
      .single()

    expect(depois?.id).toBe(convidado.id)
    expect(depois?.mesa_id).toBeNull()
  })
})
