import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * `tarefas` (fila de processamento assíncrono) só tem policy de SELECT e
 * INSERT (supabase/policies/README.md) — transições de status são
 * exclusivas do worker, que roda com `service_role` e ignora RLS. Além do
 * isolamento cross-tenant padrão, esta suíte confirma que nem o próprio
 * membro dono da tarefa consegue UPDATE/DELETE (não existe essa policy pra
 * ninguém além de `service_role`). Nunca usa o client `service_role` para
 * as asserções em si — só para criar/verificar a massa de dados.
 */
describe('RLS: tarefas', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let taskA: { id: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)

    const { data, error } = await admin
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, tipo: 'teste_integracao' })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar tarefa de teste: ${error?.message}`)
    }
    taskA = data
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar um dos usuários de teste) — cada recurso só
    // entra na limpeza se realmente chegou a ser criado, pra nunca deixar
    // uma linha órfã por causa de um `throw` no meio do setup.
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('membro do próprio casamento lê a tarefa normalmente', async () => {
    const { data, error } = await memberA.client
      .from('tarefas')
      .select('*')
      .eq('id', taskA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(taskA.id)
  })

  it('membro do próprio casamento consegue enfileirar (inserir) uma nova tarefa', async () => {
    const { data, error } = await memberA.client
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, tipo: 'teste_integracao_insercao_membro' })
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('membro de outro casamento não lê a tarefa (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .select('*')
      .eq('id', taskA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue inserir tarefa no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, tipo: 'tarefa_intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a tarefa', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .update({ status_tarefa: 'concluida' })
      .eq('id', taskA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('membro de outro casamento não consegue excluir a tarefa', async () => {
    await memberB.client.from('tarefas').delete().eq('id', taskA.id)

    const { data: stillThere } = await admin
      .from('tarefas')
      .select('id')
      .eq('id', taskA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(taskA.id)
  })

  it('nem o próprio membro do casamento consegue atualizar a tarefa (sem policy de update pra ninguém além de service_role)', async () => {
    const { data, error } = await memberA.client
      .from('tarefas')
      .update({ status_tarefa: 'concluida' })
      .eq('id', taskA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('tarefas')
      .select('status_tarefa')
      .eq('id', taskA.id)
      .single()
    expect(unchanged?.status_tarefa).toBe('pendente')
  })

  it('nem o próprio membro do casamento consegue excluir a tarefa (sem policy de delete pra ninguém além de service_role)', async () => {
    await memberA.client.from('tarefas').delete().eq('id', taskA.id)

    const { data: stillThere } = await admin
      .from('tarefas')
      .select('id')
      .eq('id', taskA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(taskA.id)
  })
})
