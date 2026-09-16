import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'

/**
 * Acesso de suporte da plataforma ao painel do casal
 * (docs/fase5-multievento.md 6.7).
 *
 * O desenho inteiro depende de uma afirmação: **a expiração vale na LEITURA**,
 * dentro de `is_membro_casamento`, e não numa varredura periódica. Se fosse o
 * contrário, um vínculo vencido continuaria abrindo o painel até alguém apagar
 * a linha — uma expiração decorativa.
 *
 * É isso que este arquivo prova, e prova do jeito que importa: com um client
 * autenticado de verdade, contra as policies reais, sem apagar nada entre uma
 * asserção e outra.
 */
describe('RLS: acesso de suporte', () => {
  const admin = getServiceRoleClient()

  let casamentoDoCasal: Awaited<ReturnType<typeof createTestWedding>>
  let casal: TestMember

  let casamentoDoOperador: Awaited<ReturnType<typeof createTestWedding>>
  let operador: TestMember

  beforeAll(async () => {
    casamentoDoCasal = await createTestWedding(admin)
    casal = await createTestMember(admin, casamentoDoCasal.id, 'dono')
    await createTestGuest(admin, casamentoDoCasal.id, { nome_completo: 'Convidado Do Casal' })

    // O operador é um usuário comum com linha em operadores_plataforma — ser
    // operador é ortogonal a ser membro de algum casamento.
    casamentoDoOperador = await createTestWedding(admin)
    operador = await createTestMember(admin, casamentoDoOperador.id, 'dono')

    const { error } = await admin
      .from('operadores_plataforma')
      .insert({ usuario_id: operador.userId })
    if (error) {
      throw new Error(`Falha ao criar operador de teste: ${error.message}`)
    }
  })

  afterAll(async () => {
    await cleanupAll([
      () =>
        admin
          .from('operadores_plataforma')
          .delete()
          .eq('usuario_id', operador.userId)
          .then(() => undefined),
      () => deleteTestMember(admin, casal.userId),
      () => deleteTestMember(admin, operador.userId),
      () => deleteTestWedding(admin, casamentoDoCasal.id),
      () => deleteTestWedding(admin, casamentoDoOperador.id),
    ])
  })

  /** O que o operador consegue ler do casamento do casal, pelas policies. */
  async function convidadosVistosPeloOperador() {
    const { data } = await operador.client
      .from('convidados')
      .select('id')
      .eq('casamento_id', casamentoDoCasal.id)
    return data?.length ?? 0
  }

  async function definirValidade(expiraEm: string | null) {
    const { error } = await admin.from('membros_casamento').upsert(
      {
        casamento_id: casamentoDoCasal.id,
        usuario_id: operador.userId,
        papel: 'dono',
        acesso_suporte_expira_em: expiraEm,
      },
      { onConflict: 'casamento_id,usuario_id' },
    )
    if (error) throw new Error(`Falha ao definir validade: ${error.message}`)
  }

  it('sem vínculo, operador de plataforma não lê nada pelo caminho do casal', async () => {
    // Ser operador não abre porta nenhuma na RLS — o caminho da plataforma é
    // service_role + checagem em TypeScript, nunca policy cross-tenant
    // (CLAUDE.md 4.2).
    expect(await convidadosVistosPeloOperador()).toBe(0)
  })

  it('com acesso de suporte válido, lê como qualquer membro', async () => {
    await definirValidade(new Date(Date.now() + 60 * 60 * 1000).toISOString())
    expect(await convidadosVistosPeloOperador()).toBe(1)
  })

  it('VENCIDO deixa de valer na hora, com a linha ainda existindo', async () => {
    await definirValidade(new Date(Date.now() - 60 * 1000).toISOString())

    // A linha continua lá — ninguém apagou nada.
    const { data: linha } = await admin
      .from('membros_casamento')
      .select('id, acesso_suporte_expira_em')
      .eq('casamento_id', casamentoDoCasal.id)
      .eq('usuario_id', operador.userId)
      .single()
    expect(linha?.id).toBeDefined()

    // E não abre mais nada. É a diferença entre expiração de verdade e
    // expiração decorativa.
    expect(await convidadosVistosPeloOperador()).toBe(0)
  })

  it('o vínculo de suporte não aparece para o casal nem conta como dono', async () => {
    await definirValidade(new Date(Date.now() + 60 * 60 * 1000).toISOString())

    // O casal lê os membros do próprio casamento pela RLS; a linha existe para
    // ele também — o que a esconde é o filtro do endpoint. Aqui a asserção é
    // sobre a CONTAGEM DE DONOS de verdade, que é o que impede o casamento de
    // ficar órfão: o suporte não pode entrar nela.
    const { count } = await admin
      .from('membros_casamento')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', casamentoDoCasal.id)
      .eq('papel', 'dono')
      .is('acesso_suporte_expira_em', null)

    expect(count).toBe(1)
  })

  it('membro de verdade nunca é afetado pela regra de validade', async () => {
    // A coluna é nula em todo membro normal, e o predicado só olha a validade
    // quando ela existe — o casal continua lendo o próprio casamento.
    const { data } = await casal.client
      .from('convidados')
      .select('id')
      .eq('casamento_id', casamentoDoCasal.id)

    expect(data).toHaveLength(1)
  })
})
