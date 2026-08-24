import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants + entre papéis (docs/ARCHITECTURE.md,
 * seção 9.1/9.2; CLAUDE.md seção 12 — só o papel "dono" pode gerenciar
 * membros). Além do isolamento cross-tenant padrão, confirma que um
 * "colaborador" do próprio casamento não consegue inserir/atualizar/excluir
 * outros membros (só ler). Nunca usa o client `service_role` para as
 * asserções em si (ele ignora RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: membros_casamento', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let donoA: TestMember
  let colaboradorA: TestMember
  let memberB: TestMember
  let extraUserId: string | null = null

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    donoA = await createTestMember(admin, weddingA.id, 'dono')
    colaboradorA = await createTestMember(admin, weddingA.id, 'colaborador')
    memberB = await createTestMember(admin, weddingB.id)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, donoA.userId),
      () => deleteTestMember(admin, colaboradorA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => (extraUserId ? deleteTestMember(admin, extraUserId) : Promise.resolve()),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('dono lê os membros do próprio casamento normalmente', async () => {
    const { data, error } = await donoA.client.from('membros_casamento').select('*').eq('casamento_id', weddingA.id)
    expect(error).toBeNull()
    expect(data?.map((m) => m.usuario_id).sort()).toEqual([donoA.userId, colaboradorA.userId].sort())
  })

  it('colaborador também lê os membros do próprio casamento', async () => {
    const { data, error } = await colaboradorA.client
      .from('membros_casamento')
      .select('*')
      .eq('casamento_id', weddingA.id)
    expect(error).toBeNull()
    expect(data?.map((m) => m.usuario_id).sort()).toEqual([donoA.userId, colaboradorA.userId].sort())
  })

  it('membro de outro casamento não lê os membros deste casamento (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('membros_casamento')
      .select('*')
      .eq('casamento_id', weddingA.id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('dono consegue inserir um novo membro no próprio casamento', async () => {
    const email = `teste-integracao-${randomUUID()}@example.com`
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (userError || !userData.user) {
      throw new Error(`Falha ao criar usuário extra de teste: ${userError?.message}`)
    }
    extraUserId = userData.user.id

    const { data, error } = await donoA.client
      .from('membros_casamento')
      .insert({ casamento_id: weddingA.id, usuario_id: extraUserId, papel: 'colaborador' })
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    const { data: created } = await admin
      .from('membros_casamento')
      .select('id')
      .eq('casamento_id', weddingA.id)
      .eq('usuario_id', extraUserId)
      .maybeSingle()
    expect(created?.id).toBeDefined()
  })

  it('colaborador não consegue inserir um novo membro (só dono pode)', async () => {
    const email = `teste-integracao-${randomUUID()}@example.com`
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (userError || !userData.user) {
      throw new Error(`Falha ao criar usuário extra de teste: ${userError?.message}`)
    }

    try {
      const { data, error } = await colaboradorA.client
        .from('membros_casamento')
        .insert({ casamento_id: weddingA.id, usuario_id: userData.user.id, papel: 'colaborador' })
        .select()

      expect(data).toBeNull()
      expect(error).not.toBeNull()

      const { data: notCreated } = await admin
        .from('membros_casamento')
        .select('id')
        .eq('casamento_id', weddingA.id)
        .eq('usuario_id', userData.user.id)
        .maybeSingle()
      expect(notCreated).toBeNull()
    } finally {
      await admin.auth.admin.deleteUser(userData.user.id)
    }
  })

  it('membro de outro casamento não consegue inserir membro no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('membros_casamento')
      .insert({ casamento_id: weddingA.id, usuario_id: memberB.userId, papel: 'colaborador' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('colaborador não consegue atualizar o papel de um membro', async () => {
    const { data, error } = await colaboradorA.client
      .from('membros_casamento')
      .update({ papel: 'dono' })
      .eq('casamento_id', weddingA.id)
      .eq('usuario_id', colaboradorA.userId)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('membros_casamento')
      .select('papel')
      .eq('casamento_id', weddingA.id)
      .eq('usuario_id', colaboradorA.userId)
      .single()
    expect(unchanged?.papel).toBe('colaborador')
  })

  it('colaborador não consegue excluir um membro', async () => {
    await colaboradorA.client
      .from('membros_casamento')
      .delete()
      .eq('casamento_id', weddingA.id)
      .eq('usuario_id', donoA.userId)

    const { data: stillThere } = await admin
      .from('membros_casamento')
      .select('id')
      .eq('casamento_id', weddingA.id)
      .eq('usuario_id', donoA.userId)
      .maybeSingle()
    expect(stillThere?.id).toBeDefined()
  })
})
