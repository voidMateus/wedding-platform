import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGift } from '../../factories/gift'
import { createTestGiftContribution } from '../../factories/gift-contribution'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * `contribuicoes_presentes` (supabase/migrations/20260730120012_gift_contributions.sql)
 * tem CRUD completo restrito a membro do casamento dono, igual ao padrão de
 * `convidados` — sem policy de leitura pública (o caminho público de
 * presentes usa `service_role`, fora do escopo desta suíte, CLAUDE.md seção
 * 4.2). Usa um presente de cota (`e_presente_cota = true`) porque
 * `contribuicoes_presentes` só se aplica a esse modo (CLAUDE.md, seção 12).
 * `convidado_id`/`convite_id` são legado, sempre `null` em registros novos
 * (docs/DATABASE.md) — a fábrica usa `nome_contribuinte`. Nunca usa o
 * client `service_role` para as asserções em si (ele ignora RLS) — só para
 * criar/limpar a massa de dados.
 */
describe('RLS: contribuicoes_presentes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let giftA: Awaited<ReturnType<typeof createTestGift>>
  let contributionA: Awaited<ReturnType<typeof createTestGiftContribution>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    giftA = await createTestGift(admin, weddingA.id, {
      titulo: 'Presente de Cota do Casamento A',
      preco_centavos: null,
      quantidade_disponivel: null,
      e_presente_cota: true,
      valor_meta_centavos: 100000,
    })
    contributionA = await createTestGiftContribution(admin, weddingA.id, giftA.id, {
      nome_contribuinte: 'Contribuinte do Casamento A',
    })
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

  it('membro do próprio casamento lê a contribuição normalmente', async () => {
    const { data, error } = await memberA.client
      .from('contribuicoes_presentes')
      .select('*')
      .eq('id', contributionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(contributionA.id)
  })

  it('membro de outro casamento não lê a contribuição (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('contribuicoes_presentes')
      .select('*')
      .eq('id', contributionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a contribuição', async () => {
    const { data, error } = await memberB.client
      .from('contribuicoes_presentes')
      .update({ nome_contribuinte: 'Nome Alterado Indevidamente' })
      .eq('id', contributionA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('contribuicoes_presentes')
      .select('nome_contribuinte')
      .eq('id', contributionA.id)
      .single()
    expect(unchanged?.nome_contribuinte).toBe('Contribuinte do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a contribuição', async () => {
    await memberB.client.from('contribuicoes_presentes').delete().eq('id', contributionA.id)

    const { data: stillThere } = await admin
      .from('contribuicoes_presentes')
      .select('id')
      .eq('id', contributionA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(contributionA.id)
  })

  it('membro de outro casamento não consegue inserir contribuição no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('contribuicoes_presentes')
      .insert({
        casamento_id: weddingA.id,
        presente_id: giftA.id,
        nome_contribuinte: 'Contribuinte Intruso',
        valor_centavos: 1000,
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
