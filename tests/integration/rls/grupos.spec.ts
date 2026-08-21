import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGroup } from '../../factories/group'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: grupos', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let groupA: Awaited<ReturnType<typeof createTestGroup>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    groupA = await createTestGroup(admin, weddingA.id, { nome: 'Grupo do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o grupo normalmente', async () => {
    const { data, error } = await memberA.client.from('grupos').select('*').eq('id', groupA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(groupA.id)
  })

  it('membro de outro casamento não lê o grupo (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client.from('grupos').select('*').eq('id', groupA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o grupo', async () => {
    const { data, error } = await memberB.client
      .from('grupos')
      .update({ nome: 'Nome Alterado Indevidamente' })
      .eq('id', groupA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('grupos').select('nome').eq('id', groupA.id).single()
    expect(unchanged?.nome).toBe('Grupo do Casamento A')
  })

  it('membro de outro casamento não consegue excluir o grupo', async () => {
    await memberB.client.from('grupos').delete().eq('id', groupA.id)

    const { data: stillThere } = await admin.from('grupos').select('id').eq('id', groupA.id).maybeSingle()
    expect(stillThere?.id).toBe(groupA.id)
  })

  it('membro de outro casamento não consegue inserir grupo no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('grupos')
      .insert({ casamento_id: weddingA.id, nome: 'Grupo Intruso' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
