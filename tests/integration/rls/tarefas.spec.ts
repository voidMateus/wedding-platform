import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * `tarefas` é a checklist do casal (Fase 3 do Hub), com as quatro policies de
 * membro: quem é do casamento faz tudo, quem não é não vê nada.
 *
 * Diferente da fila de processamento (`fila-processamento.spec.ts`, que já se
 * chamou `tarefas`), aqui o próprio membro PRECISA conseguir alterar e excluir
 * — a lista é dele, e concluir uma tarefa é o gesto mais repetido do módulo.
 *
 * Nunca usa o client `service_role` para as asserções em si — só para criar e
 * verificar a massa de dados.
 */
describe('RLS: tarefas (checklist)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let tarefaA: { id: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)

    const { data, error } = await admin
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, titulo: 'Contratar o buffet' })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar tarefa de teste: ${error?.message}`)
    }
    tarefaA = data
  })

  afterAll(async () => {
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('membro do próprio casamento lê a tarefa', async () => {
    const { data, error } = await memberA.client
      .from('tarefas')
      .select('*')
      .eq('id', tarefaA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(tarefaA.id)
  })

  it('membro do próprio casamento cria, conclui e exclui', async () => {
    const { data: criada, error: erroCriar } = await memberA.client
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, titulo: 'Provar o vestido' })
      .select()
      .single()
    expect(erroCriar).toBeNull()
    expect(criada?.titulo).toBe('Provar o vestido')

    const { data: concluida, error: erroConcluir } = await memberA.client
      .from('tarefas')
      .update({ concluida_em: new Date().toISOString() })
      .eq('id', criada!.id)
      .select()
      .single()
    expect(erroConcluir).toBeNull()
    expect(concluida?.concluida_em).not.toBeNull()

    await memberA.client.from('tarefas').delete().eq('id', criada!.id)
    const { data: sumiu } = await admin
      .from('tarefas')
      .select('id')
      .eq('id', criada!.id)
      .maybeSingle()
    // Exclusão FÍSICA: a linha some de verdade, e é isso que devolve a
    // sugestão ao rodapé.
    expect(sumiu).toBeNull()
  })

  it('membro de outro casamento não lê a tarefa', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .select('*')
      .eq('id', tarefaA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não cria tarefa no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .insert({ casamento_id: weddingA.id, titulo: 'Tarefa intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro de outro casamento não conclui nem exclui a tarefa alheia', async () => {
    const { data, error } = await memberB.client
      .from('tarefas')
      .update({ concluida_em: new Date().toISOString() })
      .eq('id', tarefaA.id)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])

    await memberB.client.from('tarefas').delete().eq('id', tarefaA.id)
    const { data: continua } = await admin
      .from('tarefas')
      .select('id, concluida_em')
      .eq('id', tarefaA.id)
      .maybeSingle()
    expect(continua?.id).toBe(tarefaA.id)
    expect(continua?.concluida_em).toBeNull()
  })

  it('a mesma sugestão não vira duas tarefas (índice único parcial)', async () => {
    const primeira = await admin
      .from('tarefas')
      .insert({
        casamento_id: weddingA.id,
        titulo: 'Enviar os convites',
        origem_catalogo: 'enviar-convites',
      })
      .select()
      .single()
    expect(primeira.error).toBeNull()

    const segunda = await admin
      .from('tarefas')
      .insert({
        casamento_id: weddingA.id,
        titulo: 'Enviar os convites',
        origem_catalogo: 'enviar-convites',
      })
      .select()
    expect(segunda.error?.code).toBe('23505')

    // O índice é PARCIAL: duas tarefas digitadas à mão, sem origem, convivem.
    const semOrigem = await admin
      .from('tarefas')
      .insert([
        { casamento_id: weddingA.id, titulo: 'Ligar para a tia' },
        { casamento_id: weddingA.id, titulo: 'Ligar para a tia' },
      ])
      .select()
    expect(semOrigem.error).toBeNull()
    expect(semOrigem.data).toHaveLength(2)
  })
})
