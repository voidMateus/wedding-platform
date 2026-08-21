import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * `contadores_uso` tem RLS habilitada e ZERO policies definidas (deny-by-
 * default — supabase/policies/README.md, "sem UI/feature usando ainda",
 * docs/ROADMAP.md seção 8). Guarda de regressão: mesmo um membro `dono` do
 * casamento dono da linha não enxerga nem altera nada — só `service_role`.
 * `casamento_id` é a própria PK da tabela (não tem `id` próprio), então o
 * teste de INSERT usa um segundo casamento (`weddingB`) sem contador ainda
 * — evita que uma tentativa de insert falhe por violação da PK em vez de
 * pela RLS, o que daria um falso positivo nesta guarda. Insere só o mínimo
 * necessário e apaga explicitamente por `casamento_id` no `afterAll`, sem
 * depender de cascade.
 */
describe('RLS: contadores_uso (deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id, 'dono')

    const { error } = await admin
      .from('contadores_uso')
      .insert({ casamento_id: weddingA.id, contagem_convidados: 5 })
    if (error) {
      throw new Error(`Falha ao criar contador de uso de teste: ${error.message}`)
    }
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar o usuário de teste) — cada recurso só entra na
    // limpeza se realmente chegou a ser criado, pra nunca deixar uma linha
    // órfã por causa de um `throw` no meio do setup.
    if (weddingA) {
      await admin.from('contadores_uso').delete().eq('casamento_id', weddingA.id)
    }
    // Rede de segurança: se a guarda de RLS algum dia falhar (regressão
    // real), a tentativa de insert no teste teria criado uma linha aqui.
    if (weddingB) {
      await admin.from('contadores_uso').delete().eq('casamento_id', weddingB.id)
    }
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('service_role consegue ler o contador (confirma que a linha de setup existe de verdade)', async () => {
    const { data, error } = await admin
      .from('contadores_uso')
      .select('*')
      .eq('casamento_id', weddingA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.casamento_id).toBe(weddingA.id)
  })

  it('membro autenticado não enxerga o contador via SELECT (sem nenhuma policy), mesmo sendo dono do casamento', async () => {
    const { data, error } = await memberA.client
      .from('contadores_uso')
      .select('*')
      .eq('casamento_id', weddingA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro autenticado não consegue inserir em contadores_uso', async () => {
    const { data, error } = await memberA.client
      .from('contadores_uso')
      .insert({ casamento_id: weddingB.id })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro autenticado não consegue atualizar o contador existente', async () => {
    const { data, error } = await memberA.client
      .from('contadores_uso')
      .update({ contagem_convidados: 999 })
      .eq('casamento_id', weddingA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('contadores_uso')
      .select('contagem_convidados')
      .eq('casamento_id', weddingA.id)
      .single()
    expect(unchanged?.contagem_convidados).toBe(5)
  })

  it('membro autenticado não consegue excluir o contador existente', async () => {
    await memberA.client.from('contadores_uso').delete().eq('casamento_id', weddingA.id)

    const { data: stillThere } = await admin
      .from('contadores_uso')
      .select('casamento_id')
      .eq('casamento_id', weddingA.id)
      .maybeSingle()
    expect(stillThere?.casamento_id).toBe(weddingA.id)
  })
})
