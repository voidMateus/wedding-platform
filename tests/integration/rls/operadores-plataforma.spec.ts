import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAnonClient, getServiceRoleClient } from '../helpers/supabase-clients'
import { TEST_MEMBER_PASSWORD } from '../../factories/member'

/**
 * `operadores_plataforma` (docs/PLANO-SAAS.md, Passo 8) — equipe interna com
 * leitura entre tenants, sem `casamento_id` (extensão 1:1 de `auth.users`,
 * mesmo padrão de `contadores_uso`). Policy única: SELECT da própria linha
 * (`usuario_id = auth.uid()`). Sem INSERT/UPDATE/DELETE — bootstrap é sempre
 * via `service_role` (mesmo racional de `casamentos`, sem policy de insert).
 * Usuários de teste criados direto (sem `createTestWedding`/`createTestMember`
 * — status de operador é independente de qualquer `membros_casamento`).
 */
describe('RLS: operadores_plataforma (select próprio, mutação deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let operatorUserId: string
  let operatorClient: ReturnType<typeof getAnonClient>
  let outsiderUserId: string
  let outsiderClient: ReturnType<typeof getAnonClient>

  beforeAll(async () => {
    const operatorEmail = `teste-integracao-${randomUUID()}@example.com`
    const { data: operatorData, error: operatorError } = await admin.auth.admin.createUser({
      email: operatorEmail,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (operatorError || !operatorData.user) {
      throw new Error(`Falha ao criar usuário operador de teste: ${operatorError?.message}`)
    }
    operatorUserId = operatorData.user.id

    const { error: insertError } = await admin
      .from('operadores_plataforma')
      .insert({ usuario_id: operatorUserId })
    if (insertError) {
      throw new Error(`Falha ao inserir operador de teste: ${insertError.message}`)
    }

    operatorClient = getAnonClient()
    const { error: signInError } = await operatorClient.auth.signInWithPassword({
      email: operatorEmail,
      password: TEST_MEMBER_PASSWORD,
    })
    if (signInError) {
      throw new Error(`Falha ao autenticar operador de teste: ${signInError.message}`)
    }

    const outsiderEmail = `teste-integracao-${randomUUID()}@example.com`
    const { data: outsiderData, error: outsiderError } = await admin.auth.admin.createUser({
      email: outsiderEmail,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (outsiderError || !outsiderData.user) {
      throw new Error(`Falha ao criar usuário não-operador de teste: ${outsiderError?.message}`)
    }
    outsiderUserId = outsiderData.user.id

    outsiderClient = getAnonClient()
    const { error: outsiderSignInError } = await outsiderClient.auth.signInWithPassword({
      email: outsiderEmail,
      password: TEST_MEMBER_PASSWORD,
    })
    if (outsiderSignInError) {
      throw new Error(`Falha ao autenticar usuário não-operador de teste: ${outsiderSignInError.message}`)
    }
  })

  afterAll(async () => {
    if (operatorUserId) {
      await admin.from('operadores_plataforma').delete().eq('usuario_id', operatorUserId)
      await admin.auth.admin.deleteUser(operatorUserId)
    }
    if (outsiderUserId) {
      await admin.auth.admin.deleteUser(outsiderUserId)
    }
  })

  it('service_role consegue ler o operador (confirma que a linha de setup existe de verdade)', async () => {
    const { data, error } = await admin
      .from('operadores_plataforma')
      .select('*')
      .eq('usuario_id', operatorUserId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.usuario_id).toBe(operatorUserId)
  })

  it('operador consegue ler a própria linha via SELECT', async () => {
    const { data, error } = await operatorClient
      .from('operadores_plataforma')
      .select('*')
      .eq('usuario_id', operatorUserId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.usuario_id).toBe(operatorUserId)
  })

  it('usuário que não é operador não enxerga a linha do operador (RLS filtra)', async () => {
    const { data, error } = await outsiderClient
      .from('operadores_plataforma')
      .select('*')
      .eq('usuario_id', operatorUserId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('cliente não autenticado (anon) não enxerga nenhuma linha', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon.from('operadores_plataforma').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('usuário autenticado não consegue se auto-inserir como operador', async () => {
    const { data, error } = await outsiderClient
      .from('operadores_plataforma')
      .insert({ usuario_id: outsiderUserId })
      .select()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('operador não consegue excluir a própria linha (sem policy de delete)', async () => {
    await operatorClient.from('operadores_plataforma').delete().eq('usuario_id', operatorUserId)

    const { data: stillThere } = await admin
      .from('operadores_plataforma')
      .select('usuario_id')
      .eq('usuario_id', operatorUserId)
      .maybeSingle()
    expect(stillThere?.usuario_id).toBe(operatorUserId)
  })
})
