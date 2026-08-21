import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGift } from '../../factories/gift'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * `presentes` (supabase/migrations/20260730120010_gifts.sql) tem CRUD
 * completo restrito a membro do casamento dono — ao contrário de
 * `categorias_presentes`, não existe policy de leitura pública aqui: a
 * vitrine pública de presentes (`server/api/public/gifts/**`) lê via
 * `service_role`, ignorando RLS por design (CLAUDE.md, seção 4.2) — fora do
 * escopo desta suíte. Nunca usa o client `service_role` para as asserções
 * em si (ele ignora RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: presentes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let giftA: Awaited<ReturnType<typeof createTestGift>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    giftA = await createTestGift(admin, weddingA.id, { titulo: 'Presente do Casamento A' })
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

  it('membro do próprio casamento lê o presente normalmente', async () => {
    const { data, error } = await memberA.client.from('presentes').select('*').eq('id', giftA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(giftA.id)
  })

  it('membro de outro casamento não lê o presente (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client.from('presentes').select('*').eq('id', giftA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o presente', async () => {
    const { data, error } = await memberB.client
      .from('presentes')
      .update({ titulo: 'Título Alterado Indevidamente' })
      .eq('id', giftA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('presentes').select('titulo').eq('id', giftA.id).single()
    expect(unchanged?.titulo).toBe('Presente do Casamento A')
  })

  it('membro de outro casamento não consegue excluir o presente', async () => {
    await memberB.client.from('presentes').delete().eq('id', giftA.id)

    const { data: stillThere } = await admin.from('presentes').select('id').eq('id', giftA.id).maybeSingle()
    expect(stillThere?.id).toBe(giftA.id)
  })

  it('membro de outro casamento não consegue inserir presente no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('presentes')
      .insert({
        casamento_id: weddingA.id,
        titulo: 'Presente Intruso',
        preco_centavos: 1000,
        quantidade_disponivel: 1,
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
