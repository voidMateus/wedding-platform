import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient, getAnonClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGiftCategory } from '../../factories/gift-category'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 *
 * `categorias_presentes` é uma exceção deliberada à leitura isolada por
 * tenant: `categorias_presentes_select_publico` (supabase/migrations/
 * 20260731150001_gift_categories_select_public.sql, renomeada em
 * 20260821090004) usa `using (true)` — leitura pública, sem filtro de
 * `casamento_id`, porque a vitrine pública de presentes precisa exibir o
 * nome da categoria sem autenticação e nenhuma coluna aqui é sensível
 * (CLAUDE.md, seção 4.2 — só tabelas sem dado sensível ganham esse padrão).
 * Por isso SELECT não é testado como isolado entre tenants aqui — só
 * INSERT/UPDATE/DELETE, que continuam restritos a membros do próprio
 * casamento.
 */
describe('RLS: categorias_presentes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let categoryA: Awaited<ReturnType<typeof createTestGiftCategory>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    categoryA = await createTestGiftCategory(admin, weddingA.id, { nome: 'Categoria do Casamento A' })
  })

  // Guards defensivos: sob concorrência real (vários agentes rodando essa
  // suíte no mesmo projeto `dev` ao mesmo tempo), o `beforeAll` pode falhar
  // no meio (ex.: rate limit do Supabase Auth em `signInWithPassword`),
  // deixando uma variável posterior indefinida — sem o guard, `cleanupAll`
  // lançaria `TypeError` ao acessar `.userId`/`.id` de `undefined` antes de
  // sequer tentar limpar o que já foi criado com sucesso.
  afterAll(async () => {
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('membro do próprio casamento lê a categoria normalmente', async () => {
    const { data, error } = await memberA.client
      .from('categorias_presentes')
      .select('*')
      .eq('id', categoryA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(categoryA.id)
  })

  it('membro de outro casamento também lê a categoria (policy pública, sem dado sensível)', async () => {
    const { data, error } = await memberB.client
      .from('categorias_presentes')
      .select('*')
      .eq('id', categoryA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(categoryA.id)
  })

  it('visitante não autenticado também lê a categoria (mesma policy pública)', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon.from('categorias_presentes').select('*').eq('id', categoryA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(categoryA.id)
  })

  it('membro de outro casamento não consegue atualizar a categoria', async () => {
    const { data, error } = await memberB.client
      .from('categorias_presentes')
      .update({ nome: 'Nome Alterado Indevidamente' })
      .eq('id', categoryA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('categorias_presentes').select('nome').eq('id', categoryA.id).single()
    expect(unchanged?.nome).toBe('Categoria do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a categoria', async () => {
    await memberB.client.from('categorias_presentes').delete().eq('id', categoryA.id)

    const { data: stillThere } = await admin.from('categorias_presentes').select('id').eq('id', categoryA.id).maybeSingle()
    expect(stillThere?.id).toBe(categoryA.id)
  })

  it('membro de outro casamento não consegue inserir categoria no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('categorias_presentes')
      .insert({ casamento_id: weddingA.id, nome: 'Categoria Intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
