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
 */
describe('RLS: convites', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id, { nome: 'Convite do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o convite normalmente', async () => {
    const { data, error } = await memberA.client.from('convites').select('*').eq('id', inviteA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(inviteA.id)
  })

  it('membro de outro casamento não lê o convite (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client.from('convites').select('*').eq('id', inviteA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o convite', async () => {
    const { data, error } = await memberB.client
      .from('convites')
      .update({ nome: 'Nome Alterado Indevidamente' })
      .eq('id', inviteA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('convites').select('nome').eq('id', inviteA.id).single()
    expect(unchanged?.nome).toBe('Convite do Casamento A')
  })

  it('membro de outro casamento não consegue excluir o convite', async () => {
    await memberB.client.from('convites').delete().eq('id', inviteA.id)

    const { data: stillThere } = await admin.from('convites').select('id').eq('id', inviteA.id).maybeSingle()
    expect(stillThere?.id).toBe(inviteA.id)
  })

  it('membro de outro casamento não consegue inserir convite no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('convites')
      .insert({ casamento_id: weddingA.id, nome: 'Convite Intruso', codigo_interno: 'INTRUSO-0001' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
