import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient, getAnonClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestEventSegment } from '../../factories/event-segment'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * `etapas_evento` tem policy pública de leitura igual a `casamentos` (o
 * cronograma aparece no site público sem autenticação), então além do
 * isolamento cross-tenant de update/delete/insert, também confirma que o
 * client anônimo lê normalmente mas nunca escreve. Nunca usa o client
 * `service_role` para as asserções em si (ele ignora RLS) — só para
 * criar/limpar a massa de dados.
 */
describe('RLS: etapas_evento', () => {
  const admin = getServiceRoleClient()
  const anon = getAnonClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let segmentA: Awaited<ReturnType<typeof createTestEventSegment>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    segmentA = await createTestEventSegment(admin, weddingA.id, { titulo: 'Cerimônia do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a etapa normalmente', async () => {
    const { data, error } = await memberA.client.from('etapas_evento').select('*').eq('id', segmentA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(segmentA.id)
  })

  it('membro de outro casamento não consegue atualizar a etapa do casamento A', async () => {
    const { data, error } = await memberB.client
      .from('etapas_evento')
      .update({ titulo: 'Título Alterado Indevidamente' })
      .eq('id', segmentA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('etapas_evento').select('titulo').eq('id', segmentA.id).single()
    expect(unchanged?.titulo).toBe('Cerimônia do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a etapa do casamento A', async () => {
    await memberB.client.from('etapas_evento').delete().eq('id', segmentA.id)

    const { data: stillThere } = await admin.from('etapas_evento').select('id').eq('id', segmentA.id).maybeSingle()
    expect(stillThere?.id).toBe(segmentA.id)
  })

  it('membro de outro casamento não consegue inserir etapa no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('etapas_evento')
      .insert({ casamento_id: weddingA.id, titulo: 'Etapa Intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('client anônimo consegue ler a etapa (policy pública, cronograma do site sem autenticação)', async () => {
    const { data, error } = await anon.from('etapas_evento').select('*').eq('id', segmentA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(segmentA.id)
  })

  it('client anônimo não consegue atualizar a etapa', async () => {
    const { data, error } = await anon
      .from('etapas_evento')
      .update({ titulo: 'Título Alterado Por Anônimo' })
      .eq('id', segmentA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('etapas_evento').select('titulo').eq('id', segmentA.id).single()
    expect(unchanged?.titulo).toBe('Cerimônia do Casamento A')
  })

  it('client anônimo não consegue excluir a etapa', async () => {
    await anon.from('etapas_evento').delete().eq('id', segmentA.id)

    const { data: stillThere } = await admin.from('etapas_evento').select('id').eq('id', segmentA.id).maybeSingle()
    expect(stillThere?.id).toBe(segmentA.id)
  })

  it('client anônimo não consegue inserir etapa', async () => {
    const { data, error } = await anon
      .from('etapas_evento')
      .insert({ casamento_id: weddingA.id, titulo: 'Etapa Intrusa Anônima' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
