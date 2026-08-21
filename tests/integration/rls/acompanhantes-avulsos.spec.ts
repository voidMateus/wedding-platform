import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 *
 * `acompanhantes_avulsos` (ex-companions) referencia `convite_id`, com
 * `casamento_id` denormalizado na própria linha.
 */
describe('RLS: acompanhantes_avulsos', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let companionA: { id: string; nome_completo: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)

    const { data, error } = await admin
      .from('acompanhantes_avulsos')
      .insert({
        casamento_id: weddingA.id,
        convite_id: inviteA.id,
        nome_completo: 'Acompanhante Avulso do Casamento A',
      })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar acompanhante avulso de teste: ${error?.message}`)
    }
    companionA = data
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o acompanhante avulso normalmente', async () => {
    const { data, error } = await memberA.client
      .from('acompanhantes_avulsos')
      .select('*')
      .eq('id', companionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(companionA.id)
  })

  it('membro de outro casamento não lê o acompanhante avulso (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('acompanhantes_avulsos')
      .select('*')
      .eq('id', companionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o acompanhante avulso', async () => {
    const { data, error } = await memberB.client
      .from('acompanhantes_avulsos')
      .update({ nome_completo: 'Nome Alterado Indevidamente' })
      .eq('id', companionA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('acompanhantes_avulsos')
      .select('nome_completo')
      .eq('id', companionA.id)
      .single()
    expect(unchanged?.nome_completo).toBe('Acompanhante Avulso do Casamento A')
  })

  it('membro de outro casamento não consegue excluir o acompanhante avulso', async () => {
    await memberB.client.from('acompanhantes_avulsos').delete().eq('id', companionA.id)

    const { data: stillThere } = await admin
      .from('acompanhantes_avulsos')
      .select('id')
      .eq('id', companionA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(companionA.id)
  })

  it('membro de outro casamento não consegue inserir acompanhante avulso no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('acompanhantes_avulsos')
      .insert({
        casamento_id: weddingA.id,
        convite_id: inviteA.id,
        nome_completo: 'Acompanhante Intruso',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
