import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGift } from '../../factories/gift'
import { createTestGiftPayment } from '../../factories/gift-payment'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 *
 * `pagamentos_presentes` (supabase/migrations/20260805120005_gift_payments_table.sql)
 * é um caso especial: só existe a policy `pagamentos_presentes_select_membro`
 * (leitura). Não há NENHUMA policy de insert/update/delete — nem para o
 * dono do casamento — porque o único jeito de mutar esta tabela é a lógica
 * verificada em `confirmar_pagamento_presente()` (supabase/migrations/
 * 20260821090003_pt_br_funcoes_e_triggers.sql), executada pelo
 * `service_role` no caminho do convidado, que ignora RLS por design
 * (CLAUDE.md, seção 4.2). Isso é deliberado, não uma lacuna — mesmo padrão
 * de tabela "só leitura para membro" de `historico_convite`. Por isso esta
 * suíte confirma explicitamente que nem o membro do PRÓPRIO casamento
 * consegue inserir/atualizar/excluir via seu client autenticado (RLS nega
 * por ausência de policy, não é isolamento entre tenants no sentido
 * usual). Nunca usa o client `service_role` para as asserções em si (ele
 * ignora RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: pagamentos_presentes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let giftA: Awaited<ReturnType<typeof createTestGift>>
  let paymentA: Awaited<ReturnType<typeof createTestGiftPayment>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    giftA = await createTestGift(admin, weddingA.id, { titulo: 'Presente Simples do Casamento A' })
    paymentA = await createTestGiftPayment(admin, weddingA.id, giftA.id, {
      nome_presenteador: 'Presenteador do Casamento A',
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

  it('membro do próprio casamento lê a tentativa de pagamento normalmente', async () => {
    const { data, error } = await memberA.client
      .from('pagamentos_presentes')
      .select('*')
      .eq('id', paymentA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(paymentA.id)
  })

  it('membro de outro casamento não lê a tentativa de pagamento (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('pagamentos_presentes')
      .select('*')
      .eq('id', paymentA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('nem o membro do próprio casamento consegue atualizar a tentativa de pagamento (não há policy de update)', async () => {
    const { data, error } = await memberA.client
      .from('pagamentos_presentes')
      .update({ status_pagamento: 'confirmado' })
      .eq('id', paymentA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('pagamentos_presentes')
      .select('status_pagamento')
      .eq('id', paymentA.id)
      .single()
    expect(unchanged?.status_pagamento).toBe('pendente')
  })

  it('nem o membro do próprio casamento consegue excluir a tentativa de pagamento (não há policy de delete)', async () => {
    await memberA.client.from('pagamentos_presentes').delete().eq('id', paymentA.id)

    const { data: stillThere } = await admin
      .from('pagamentos_presentes')
      .select('id')
      .eq('id', paymentA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(paymentA.id)
  })

  it('nem o membro do próprio casamento consegue inserir uma tentativa de pagamento (não há policy de insert)', async () => {
    const { data, error } = await memberA.client
      .from('pagamentos_presentes')
      .insert({
        casamento_id: weddingA.id,
        presente_id: giftA.id,
        nome_presenteador: 'Presenteador Intruso',
        nsu_pedido_provedor: `teste-integracao-insert-indevido-${paymentA.id}`,
        tipo: 'reserva',
        valor_centavos: 1000,
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro de outro casamento não consegue inserir uma tentativa de pagamento no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('pagamentos_presentes')
      .insert({
        casamento_id: weddingA.id,
        presente_id: giftA.id,
        nome_presenteador: 'Presenteador Intruso',
        nsu_pedido_provedor: `teste-integracao-insert-cruzado-${paymentA.id}`,
        tipo: 'reserva',
        valor_centavos: 1000,
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
