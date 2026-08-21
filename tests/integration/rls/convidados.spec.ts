import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: convidados', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let guestA: Awaited<ReturnType<typeof createTestGuest>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    guestA = await createTestGuest(admin, weddingA.id, { nome_completo: 'Convidado do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o convidado normalmente', async () => {
    const { data, error } = await memberA.client.from('convidados').select('*').eq('id', guestA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(guestA.id)
  })

  it('membro de outro casamento não lê o convidado (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client.from('convidados').select('*').eq('id', guestA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o convidado', async () => {
    const { data, error } = await memberB.client
      .from('convidados')
      .update({ nome_completo: 'Nome Alterado Indevidamente' })
      .eq('id', guestA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('convidados').select('nome_completo').eq('id', guestA.id).single()
    expect(unchanged?.nome_completo).toBe('Convidado do Casamento A')
  })

  it('membro de outro casamento não consegue excluir o convidado', async () => {
    await memberB.client.from('convidados').delete().eq('id', guestA.id)

    const { data: stillThere } = await admin.from('convidados').select('id').eq('id', guestA.id).maybeSingle()
    expect(stillThere?.id).toBe(guestA.id)
  })

  it('membro de outro casamento não consegue inserir convidado no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('convidados')
      .insert({ casamento_id: weddingA.id, nome_completo: 'Convidado Intruso' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
