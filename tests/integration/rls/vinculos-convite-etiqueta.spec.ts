import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestInviteTag, createTestInviteTagLink } from '../../factories/invite-tag'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2).
 * `vinculos_convite_etiqueta` é uma junção M:N pura, sem `casamento_id`
 * próprio (docs/DATABASE.md, seção "Convidados/RSVP/Convites") — a policy
 * autoriza via subquery em `convites` (supabase/migrations/
 * 20260803120010_invite_tags.sql): `exists (select 1 from invites i where
 * i.id = invite_id and is_wedding_member(i.wedding_id))`. Isso vale mesmo
 * que o atacante já tenha os UUIDs de `convite_id`/`etiqueta_id` (ex.:
 * vazados) — a checagem de posse é sempre pela associação do convidado
 * usuário autenticado ao casamento dono do convite, nunca pelo UUID em si.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 */
describe('RLS: vinculos_convite_etiqueta', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let tagA: Awaited<ReturnType<typeof createTestInviteTag>>
  /** Etiqueta extra do casamento A, deliberadamente sem vínculo, só para o teste de insert (evita colidir com a PK composta já usada por `linkA`). */
  let tagA2: Awaited<ReturnType<typeof createTestInviteTag>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)
    tagA = await createTestInviteTag(admin, weddingA.id, { nome: 'Etiqueta Vinculada A' })
    tagA2 = await createTestInviteTag(admin, weddingA.id, { nome: 'Etiqueta Não Vinculada A' })
    await createTestInviteTagLink(admin, inviteA.id, tagA.id)
  })

  afterAll(async () => {
    // Cascata (`on delete cascade`) a partir de `casamentos` cuida de
    // convites/etiquetas_convite/vinculos_convite_etiqueta.
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o vínculo normalmente', async () => {
    const { data, error } = await memberA.client
      .from('vinculos_convite_etiqueta')
      .select('*')
      .eq('convite_id', inviteA.id)
      .eq('etiqueta_id', tagA.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.convite_id).toBe(inviteA.id)
    expect(data?.etiqueta_id).toBe(tagA.id)
  })

  it('membro de outro casamento não lê o vínculo mesmo sabendo os UUIDs (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('vinculos_convite_etiqueta')
      .select('*')
      .eq('convite_id', inviteA.id)
      .eq('etiqueta_id', tagA.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue inserir vínculo usando UUIDs do casamento A', async () => {
    const { data, error } = await memberB.client
      .from('vinculos_convite_etiqueta')
      .insert({ convite_id: inviteA.id, etiqueta_id: tagA2.id })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()

    const { data: stillAbsent } = await admin
      .from('vinculos_convite_etiqueta')
      .select('convite_id')
      .eq('convite_id', inviteA.id)
      .eq('etiqueta_id', tagA2.id)
      .maybeSingle()
    expect(stillAbsent).toBeNull()
  })

  it('membro de outro casamento não consegue excluir o vínculo', async () => {
    await memberB.client
      .from('vinculos_convite_etiqueta')
      .delete()
      .eq('convite_id', inviteA.id)
      .eq('etiqueta_id', tagA.id)

    const { data: stillThere } = await admin
      .from('vinculos_convite_etiqueta')
      .select('convite_id')
      .eq('convite_id', inviteA.id)
      .eq('etiqueta_id', tagA.id)
      .maybeSingle()
    expect(stillThere?.convite_id).toBe(inviteA.id)
  })
})
