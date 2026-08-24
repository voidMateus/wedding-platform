import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGift } from '../../factories/gift'
import { createTestGiftReservation } from '../../factories/gift-reservation'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * `reservas_presentes` (supabase/migrations/20260730120011_gift_reservations.sql)
 * tem CRUD completo restrito a membro do casamento dono, igual ao padrão de
 * `convidados` — sem policy de leitura pública (o caminho público de
 * presentes usa `service_role`, fora do escopo desta suíte, CLAUDE.md seção
 * 4.2). `convidado_id`/`convite_id` são legado, sempre `null` em registros
 * novos (docs/DATABASE.md) — a fábrica usa `nome_contribuinte` para
 * identificar a reserva. Nunca usa o client `service_role` para as
 * asserções em si (ele ignora RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: reservas_presentes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let giftA: Awaited<ReturnType<typeof createTestGift>>
  let reservationA: Awaited<ReturnType<typeof createTestGiftReservation>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    giftA = await createTestGift(admin, weddingA.id, { titulo: 'Presente Simples do Casamento A' })
    reservationA = await createTestGiftReservation(admin, weddingA.id, giftA.id, {
      nome_contribuinte: 'Presenteador do Casamento A',
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

  it('membro do próprio casamento lê a reserva normalmente', async () => {
    const { data, error } = await memberA.client
      .from('reservas_presentes')
      .select('*')
      .eq('id', reservationA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(reservationA.id)
  })

  it('membro de outro casamento não lê a reserva (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('reservas_presentes')
      .select('*')
      .eq('id', reservationA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a reserva', async () => {
    const { data, error } = await memberB.client
      .from('reservas_presentes')
      .update({ nome_contribuinte: 'Nome Alterado Indevidamente' })
      .eq('id', reservationA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('reservas_presentes')
      .select('nome_contribuinte')
      .eq('id', reservationA.id)
      .single()
    expect(unchanged?.nome_contribuinte).toBe('Presenteador do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a reserva', async () => {
    await memberB.client.from('reservas_presentes').delete().eq('id', reservationA.id)

    const { data: stillThere } = await admin
      .from('reservas_presentes')
      .select('id')
      .eq('id', reservationA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(reservationA.id)
  })

  it('membro de outro casamento não consegue inserir reserva no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('reservas_presentes')
      .insert({
        casamento_id: weddingA.id,
        presente_id: giftA.id,
        nome_contribuinte: 'Presenteador Intruso',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
