import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'

/**
 * Integração — a ficha do casamento no painel interno
 * (docs/fase5-multievento.md 6.6).
 *
 * O que precisa ser verdade, e por isso é verificado contra o servidor e o
 * banco reais: o portão, a edição, o que a edição NÃO pode fazer (publicar),
 * a trava do último dono, e a exclusão — que é a única ação do produto sem
 * desfazer, e cujo registro precisa sobreviver ao que ela apaga.
 */
describe('api: ficha do casamento no /plataforma', () => {
  const admin = getServiceRoleClient()

  let casamentoDoOperador: Awaited<ReturnType<typeof createTestWedding>>
  let operador: Awaited<ReturnType<typeof createTestMember>>
  let cookieOperador: string

  let casamentoComum: Awaited<ReturnType<typeof createTestWedding>>
  let membroComum: Awaited<ReturnType<typeof createTestMember>>
  let cookieComum: string

  // Usuários REUTILIZADOS entre os testes, não um por caso: o Supabase Auth
  // limita requisições, e um spec que cria conta a cada `it` derruba os
  // vizinhos da suíte com "Request rate limit reached" — aconteceu.
  let usuarioA: Awaited<ReturnType<typeof createTestMember>>
  let usuarioB: Awaited<ReturnType<typeof createTestMember>>
  const casamentosDescartaveis: string[] = []

  beforeAll(async () => {
    casamentoDoOperador = await createTestWedding(admin)
    operador = await createTestMember(admin, casamentoDoOperador.id)
    cookieOperador = await getAdminSessionCookie(operador.email, TEST_MEMBER_PASSWORD)

    const { error } = await admin
      .from('operadores_plataforma')
      .insert({ usuario_id: operador.userId })
    if (error) {
      throw new Error(`Falha ao criar operador de teste: ${error.message}`)
    }

    casamentoComum = await createTestWedding(admin)
    membroComum = await createTestMember(admin, casamentoComum.id)
    cookieComum = await getAdminSessionCookie(membroComum.email, TEST_MEMBER_PASSWORD)

    // Duas contas que servem a todos os casos. O casamento delas é
    // descartável — ser membro de um casamento é ortogonal ao que se testa.
    usuarioA = await createTestMember(admin, casamentoComum.id, 'colaborador')
    usuarioB = await createTestMember(admin, casamentoComum.id, 'planejador')
  })

  afterAll(async () => {
    await cleanupAll([
      ...casamentosDescartaveis.map((id) => () => deleteTestWedding(admin, id)),
      () => deleteTestMember(admin, usuarioA.userId),
      () => deleteTestMember(admin, usuarioB.userId),
      () =>
        admin
          .from('operadores_plataforma')
          .delete()
          .eq('usuario_id', operador.userId)
          .then(() => undefined),
      () => deleteTestMember(admin, operador.userId),
      () => deleteTestWedding(admin, casamentoDoOperador.id),
      () => deleteTestMember(admin, membroComum.userId),
      () => deleteTestWedding(admin, casamentoComum.id),
    ])
  })

  /**
   * Casamento descartável com um dono, para os testes destrutivos.
   *
   * O dono é o `usuarioA`, vinculado direto — `createTestMember` criaria uma
   * conta de auth nova a cada chamada, e é isso que estoura o rate limit.
   */
  async function casamentoDescartavel() {
    const casamento = await createTestWedding(admin, { status_ciclo_vida: 'rascunho' })
    const { error } = await admin
      .from('membros_casamento')
      .insert({ casamento_id: casamento.id, usuario_id: usuarioA.userId, papel: 'dono' })
    if (error) {
      throw new Error(`Falha ao vincular dono de teste: ${error.message}`)
    }
    casamentosDescartaveis.push(casamento.id)
    return { casamento }
  }

  it('recusa quem não é operador de plataforma', async () => {
    const client = createTestApiClient({ cookie: cookieComum })
    const res = await client.get(`/api/platform/weddings/${casamentoComum.id}`)

    expect(res.status).toBe(403)
  })

  it('a ficha traz acessos, porte e o que já saiu daqui', async () => {
    const { casamento } = await casamentoDescartavel()
    await createTestGuest(admin, casamento.id, { nome_completo: 'Convidado Da Ficha' })

    const client = createTestApiClient({ cookie: cookieOperador })
    const res = await client.get(`/api/platform/weddings/${casamento.id}`)
    expect(res.status).toBe(200)

    const { data } = await res.json()
    expect(data.slug).toBe(casamento.slug)
    expect(data.contagemConvidados).toBe(1)
    expect(data.membros).toHaveLength(1)
    expect(data.membros[0].papel).toBe('dono')
    // O número que decide se trocar o slug quebra alguma coisa.
    expect(data.convitesEnviados).toBe(0)
  })

  it('edita nomes, data e slug, e registra o slug anterior na trilha', async () => {
    const { casamento } = await casamentoDescartavel()
    const client = createTestApiClient({ cookie: cookieOperador })

    const novoSlug = `teste-integracao-editado-${randomUUID().slice(0, 8)}`
    const res = await client.patch(`/api/platform/weddings/${casamento.id}`, {
      nomesNoivos: 'Editado & Editada',
      slug: novoSlug,
    })
    expect(res.status).toBe(200)

    const { data: depois } = await admin
      .from('casamentos')
      .select('slug, nomes_noivos')
      .eq('id', casamento.id)
      .single()
    expect(depois?.slug).toBe(novoSlug)
    expect(depois?.nomes_noivos).toBe('Editado & Editada')

    // Trocar o endereço quebra link já compartilhado — o registro precisa
    // dizer qual era o anterior, senão "o slug mudou" não conta nada.
    const { data: trilha } = await admin
      .from('trilha_auditoria')
      .select('acao, tipo_autor, metadados')
      .eq('casamento_id', casamento.id)
      .eq('acao', 'casamento.editar')
      .single()

    expect(trilha?.tipo_autor).toBe('operador')
    expect((trilha?.metadados as Record<string, unknown>).slug_anterior).toBe(casamento.slug)
    expect((trilha?.metadados as Record<string, unknown>).slug_novo).toBe(novoSlug)
  })

  it('não aceita publicar um casamento — quem põe o site no ar é o casal', async () => {
    const { casamento } = await casamentoDescartavel()
    const client = createTestApiClient({ cookie: cookieOperador })

    const res = await client.patch(`/api/platform/weddings/${casamento.id}`, {
      statusCicloVida: 'publicado',
    })
    expect(res.status).toBe(400)

    const { data: inalterado } = await admin
      .from('casamentos')
      .select('status_ciclo_vida')
      .eq('id', casamento.id)
      .single()
    expect(inalterado?.status_ciclo_vida).toBe('rascunho')
  })

  it('arquiva e desarquiva — e desarquivar devolve para rascunho, nunca publicado', async () => {
    const casamento = await createTestWedding(admin, { status_ciclo_vida: 'publicado' })
    casamentosDescartaveis.push(casamento.id)
    const client = createTestApiClient({ cookie: cookieOperador })

    await client.patch(`/api/platform/weddings/${casamento.id}`, { statusCicloVida: 'arquivado' })
    const { data: arquivado } = await admin
      .from('casamentos')
      .select('status_ciclo_vida, arquivado_em')
      .eq('id', casamento.id)
      .single()
    expect(arquivado?.status_ciclo_vida).toBe('arquivado')
    expect(arquivado?.arquivado_em).not.toBeNull()

    await client.patch(`/api/platform/weddings/${casamento.id}`, { statusCicloVida: 'rascunho' })
    const { data: restaurado } = await admin
      .from('casamentos')
      .select('status_ciclo_vida, arquivado_em')
      .eq('id', casamento.id)
      .single()

    // Estava PUBLICADO antes de arquivar, e volta como RASCUNHO: restaurar
    // direto para publicado seria a plataforma republicando o site de alguém.
    expect(restaurado?.status_ciclo_vida).toBe('rascunho')
    expect(restaurado?.arquivado_em).toBeNull()
  })

  it('vincula acesso em qualquer papel — o operador está fora da escada', async () => {
    const { casamento } = await casamentoDescartavel()
    const client = createTestApiClient({ cookie: cookieOperador })

    const res = await client.post(`/api/platform/weddings/${casamento.id}/members`, {
      email: usuarioB.email,
      papel: 'planejador',
    })
    expect(res.status).toBe(201)

    const { data: membros } = await admin
      .from('membros_casamento')
      .select('papel')
      .eq('casamento_id', casamento.id)
    expect(membros?.map((m) => m.papel).sort()).toEqual(['dono', 'planejador'])
  })

  it('nunca remove o último dono', async () => {
    const { casamento } = await casamentoDescartavel()
    const client = createTestApiClient({ cookie: cookieOperador })

    const { data: dono } = await admin
      .from('membros_casamento')
      .select('id')
      .eq('casamento_id', casamento.id)
      .eq('papel', 'dono')
      .single()

    const res = await client.del(`/api/platform/weddings/${casamento.id}/members/${dono!.id}`)
    expect(res.status).toBe(409)

    // Com um segundo dono vinculado, o primeiro sai.
    await client.post(`/api/platform/weddings/${casamento.id}/members`, {
      email: usuarioB.email,
      papel: 'dono',
    })
    const segunda = await client.del(`/api/platform/weddings/${casamento.id}/members/${dono!.id}`)
    expect(segunda.status).toBe(200)
  })

  it('exclui o casamento, e o registro sobrevive ao que ele apaga', async () => {
    const { casamento } = await casamentoDescartavel()
    await createTestGuest(admin, casamento.id, { nome_completo: 'Some Junto' })

    const client = createTestApiClient({ cookie: cookieOperador })
    const res = await client.del(`/api/platform/weddings/${casamento.id}`)
    expect(res.status).toBe(200)

    // O casamento e tudo que dependia dele (34 FKs com cascade).
    const { data: sumiu } = await admin
      .from('casamentos')
      .select('id')
      .eq('id', casamento.id)
      .maybeSingle()
    expect(sumiu).toBeNull()

    const { count: convidados } = await admin
      .from('convidados')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', casamento.id)
    expect(convidados).toBe(0)

    // O registro NÃO some junto: é por isso que ele não mora em
    // trilha_auditoria, que cascateia com o casamento.
    const { data: registro } = await admin
      .from('exclusoes_de_casamento')
      .select('slug, nomes_noivos, contagem_convidados, operador_id')
      .eq('casamento_id', casamento.id)
      .single()

    expect(registro?.slug).toBe(casamento.slug)
    expect(registro?.contagem_convidados).toBe(1)
    expect(registro?.operador_id).toBe(operador.userId)

    await admin.from('exclusoes_de_casamento').delete().eq('casamento_id', casamento.id)
    // Já não existe — sai da limpeza para o afterAll não tentar de novo.
    casamentosDescartaveis.splice(casamentosDescartaveis.indexOf(casamento.id), 1)
  })

  it('abre e encerra acesso de suporte, e o casal não o vê na lista de acessos', async () => {
    const { casamento } = await casamentoDescartavel()
    const client = createTestApiClient({ cookie: cookieOperador })

    const abrir = await client.post(`/api/platform/weddings/${casamento.id}/support-access`)
    expect(abrir.status).toBe(200)
    const { data: acesso } = await abrir.json()
    expect(acesso.slug).toBe(casamento.slug)
    expect(acesso.expiraEm).toBeTruthy()

    // A linha existe, com validade — é o que faz o painel abrir.
    const { data: vinculo } = await admin
      .from('membros_casamento')
      .select('papel, acesso_suporte_expira_em')
      .eq('casamento_id', casamento.id)
      .eq('usuario_id', operador.userId)
      .single()
    expect(vinculo?.papel).toBe('dono')
    expect(vinculo?.acesso_suporte_expira_em).toBeTruthy()

    // E a ficha não a conta como "quem tem acesso": ela é estado da própria
    // tela do operador, não mais uma linha de membro.
    const ficha = await client.get(`/api/platform/weddings/${casamento.id}`)
    const { data: detalhe } = await ficha.json()
    expect(detalhe.membros).toHaveLength(1)
    expect(detalhe.acessoDeSuporteAte).toBeTruthy()

    // Silencioso na tela, nunca na trilha (docs/fase5-multievento.md 6.7).
    const { data: trilha } = await admin
      .from('trilha_auditoria')
      .select('acao, tipo_autor')
      .eq('casamento_id', casamento.id)
      .eq('acao', 'suporte.acesso_concedido')
      .single()
    expect(trilha?.tipo_autor).toBe('operador')

    const encerrar = await client.del(`/api/platform/weddings/${casamento.id}/support-access`)
    expect(encerrar.status).toBe(200)

    const { data: sumiu } = await admin
      .from('membros_casamento')
      .select('id')
      .eq('casamento_id', casamento.id)
      .eq('usuario_id', operador.userId)
      .maybeSingle()
    expect(sumiu).toBeNull()
  })
})
