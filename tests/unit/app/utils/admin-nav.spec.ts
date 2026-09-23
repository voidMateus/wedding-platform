import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  QUERY_SECAO_CONFIGURACOES,
  SETTINGS_ASSUNTOS,
  adminPrimaryNav,
  adminSectionMenu,
  assuntoDaSecao,
  ehItemAtivo,
} from '../../../../app/utils/admin-nav'

const SLUG = 'ana-e-joao'
const BASE = `/admin/${SLUG}`

function rota(path: string, query: Record<string, unknown> = {}) {
  return { path, query }
}

function itemPrimario(label: string) {
  const item = adminPrimaryNav(SLUG).find((i) => i.label === label)
  if (!item) throw new Error(`item "${label}" não existe na nav primária`)
  return item
}

describe('nav primária do admin', () => {
  // Convites deixou de ter aba própria: é tela do módulo Convidados. Sem a
  // posse declarada, o operador ficaria dentro do módulo sem nenhuma aba acesa.
  it.each(['/convidados', '/convidados/lista', '/grupos', '/convites'])(
    'acende Convidados em %s',
    (caminho) => {
      expect(ehItemAtivo(itemPrimario('Convidados'), rota(`${BASE}${caminho}`))).toBe(true)
    },
  )

  it('não acende Convidados numa tela de outro módulo', () => {
    expect(ehItemAtivo(itemPrimario('Convidados'), rota(`${BASE}/presentes`))).toBe(false)
  })

  // Convites entrou em Convidados; Cronograma e Galeria, em Configurações. Com
  // Planejamento (Fase 3 do Hub) são seis destinos, e a barra do celular mostra
  // só os QUATRO primeiros — então a ORDEM aqui é parte do contrato, não
  // detalhe de escrita: ela é que decide quem fica na barra e quem desce para o
  // "Mais" (hoje, Presentes e Configurações).
  it('mantém as seis abas de módulo no topo, nesta ordem', () => {
    expect(adminPrimaryNav(SLUG).map((i) => i.label)).toEqual([
      'Início',
      'Planejamento',
      'Convidados',
      'Financeiro',
      'Presentes',
      'Configurações',
    ])
  })

  it('Planejamento acende na tela dele', () => {
    expect(ehItemAtivo(itemPrimario('Planejamento'), rota(`${BASE}/planejamento`))).toBe(true)
    expect(ehItemAtivo(itemPrimario('Planejamento'), rota(`${BASE}/financeiro`))).toBe(false)
  })

  // Uma tela, um eixo: sem menu de seção, a coluna não existe e o conteúdo fica
  // com a largura toda. Presentes era o outro caso assim até 23/09/2026.
  it('Planejamento não desenha menu de seção', () => {
    expect(adminSectionMenu(SLUG, `${BASE}/planejamento`)).toEqual([])
  })

  it.each(['/financeiro', '/financeiro/pagamentos', '/financeiro/gastos/abc'])(
    'acende Financeiro em %s',
    (caminho) => {
      expect(ehItemAtivo(itemPrimario('Financeiro'), rota(`${BASE}${caminho}`))).toBe(true)
    },
  )

  it.each(['/configuracoes', '/cronograma', '/galeria'])(
    'acende Configurações em %s',
    (caminho) => {
      expect(ehItemAtivo(itemPrimario('Configurações'), rota(`${BASE}${caminho}`))).toBe(true)
    },
  )

  // `exact`, senão Início ficaria aceso em toda tela do painel.
  it('Início acende só na raiz', () => {
    expect(ehItemAtivo(itemPrimario('Início'), rota(BASE))).toBe(true)
    expect(ehItemAtivo(itemPrimario('Início'), rota(`${BASE}/convidados`))).toBe(false)
  })
})

/**
 * A busca do painel esteve no cabeçalho até o PR #99 (o admin em módulos), e
 * saiu de carona naquela reestruturação: o componente continuou no
 * repositório, mantido, e sem nenhuma tela que o montasse — ninguém percebeu
 * por semanas, porque a perda de uma busca é muda. Ela não quebra nada; só
 * deixa de estar lá.
 */
describe('cabeçalho do admin', () => {
  it('monta a busca do painel', () => {
    const layout = readFileSync(join(process.cwd(), 'app', 'layouts', 'admin.vue'), 'utf8')

    expect(layout).toContain('<AdminGlobalSearch')
  })
})

describe('menu da seção', () => {
  it.each(['/convidados', '/convidados/lista', '/grupos', '/convites'])(
    'desenha a coluna do módulo em %s',
    (caminho) => {
      expect(adminSectionMenu(SLUG, `${BASE}${caminho}`).length).toBeGreaterThan(0)
    },
  )

  it('não desenha coluna onde a seção não tem menu', () => {
    expect(adminSectionMenu(SLUG, `${BASE}/planejamento`)).toEqual([])
  })

  /**
   * Presentes ganhou menu de seção na Fase E (ponto 21), e os três itens são
   * os três critérios que o projeto aceita: o OBJETO, outro EIXO sobre ele e o
   * lado de fora. Não existe item de Categorias, como não existe no
   * Financeiro — categoria é atributo, então ela é filtro e ordenação.
   */
  it('desenha os três destinos de Presentes, sem tela de categorias', () => {
    const grupos = adminSectionMenu(SLUG, `${BASE}/presentes`)

    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.itens.map((i) => i.label)).toEqual(['Lista', 'Recebidos', 'No site'])
    expect(grupos[0]?.itens.map((i) => i.label)).not.toContain('Categorias')
  })

  it.each(['/presentes', '/presentes/recebidos', '/presentes/site'])(
    'acende Presentes em %s',
    (caminho) => {
      expect(ehItemAtivo(itemPrimario('Presentes'), rota(`${BASE}${caminho}`))).toBe(true)
    },
  )

  // `exact` na Lista: sem ele, ela ficaria acesa junto de Recebidos e "No
  // site", que são filhas do mesmo prefixo.
  it('a Lista só acende na própria tela', () => {
    const lista = adminSectionMenu(SLUG, `${BASE}/presentes`)[0]?.itens[0]

    expect(ehItemAtivo(lista!, rota(`${BASE}/presentes`))).toBe(true)
    expect(ehItemAtivo(lista!, rota(`${BASE}/presentes/recebidos`))).toBe(false)
  })

  it('leva Convites para Gerenciar, junto de Grupos', () => {
    const gerenciar = adminSectionMenu(SLUG, `${BASE}/convidados`).find(
      (g) => g.label === 'Gerenciar',
    )
    expect(gerenciar?.itens.map((i) => i.label)).toEqual([
      'Grupos',
      'Convites',
      'Comunicações',
      'Mesas',
      'Faixas etárias',
    ])
  })

  // "Importar" é a Visão Geral com `?importar=1`. Sem `desativadoPor`, os dois
  // itens acenderiam juntos — são a mesma rota.
  it('Visão Geral apaga quando Importar reivindica a query', () => {
    const convidados = adminSectionMenu(SLUG, `${BASE}/convidados`)[0]!
    const visaoGeral = convidados.itens.find((i) => i.label === 'Visão Geral')!
    const importar = convidados.itens.find((i) => i.label === 'Importar')!
    const comImportador = rota(`${BASE}/convidados`, { importar: '1' })

    expect(ehItemAtivo(visaoGeral, comImportador)).toBe(false)
    expect(ehItemAtivo(importar, comImportador)).toBe(true)
  })

  // Filtro na URL não é query reivindicada por irmão — não pode apagar o item.
  it('filtro na URL não apaga Visão Geral', () => {
    const convidados = adminSectionMenu(SLUG, `${BASE}/convidados`)[0]!
    const visaoGeral = convidados.itens.find((i) => i.label === 'Visão Geral')!

    expect(ehItemAtivo(visaoGeral, rota(`${BASE}/convidados`, { nome: 'joao' }))).toBe(true)
  })

  it('item sem destino nunca acende', () => {
    // Item sintético: o menu de Convidados não tem mais nenhum inerte (ver o
    // teste abaixo), mas a regra continua valendo para quem criar um.
    const semDestino = { label: 'Em breve', icon: 'lucide:plug', indisponivel: 'Em breve.' }

    expect(ehItemAtivo(semDestino, rota(`${BASE}/convidados`))).toBe(false)
  })

  // Três itens inertes viveram aqui — "Núcleos" (tela descartada, não adiada),
  // "Formulários" e "Integrações" (nada por trás). Item que promete e não
  // entrega gasta a atenção de quem procura o recurso e devolve um `title`
  // explicando que não existe.
  it('nenhum item do módulo Convidados promete tela que não existe', () => {
    const itens = adminSectionMenu(SLUG, `${BASE}/convidados`).flatMap((grupo) => grupo.itens)

    expect(itens.filter((item) => !item.to)).toEqual([])
    expect(itens.filter((item) => item.indisponivel)).toEqual([])
  })
})

describe('menu da seção do Financeiro', () => {
  it.each(['/financeiro', '/financeiro/pagamentos', '/financeiro/gastos/abc'])(
    'desenha a coluna do módulo em %s',
    (caminho) => {
      expect(adminSectionMenu(SLUG, `${BASE}${caminho}`).length).toBeGreaterThan(0)
    },
  )

  // Um objeto e quatro perguntas, na ordem do dinheiro na vida do casal: Gastos é
  // a lista, "Planejar" é onde ele se planeja e se soma ("onde
  // está indo?"), e Pagamentos é o mesmo dinheiro no eixo do tempo. Fornecedores
  // e Documentos deixaram de ser tela — viraram seções da ficha. Fornecedores
  // voltou em 22/09/2026 como tela de LEITURA (ponto 18): o cadastro continua
  // dentro da ficha do gasto, e o que ela responde é quem vai atender o
  // casamento — a lista que se leva para o dia do evento.
  //
  // O rótulo do meio era "Categorias", o nome do OBJETO: quem entrava em
  // Financeiro não tinha pista de que o planejamento por categoria existia
  // (rodada de usabilidade de 20/09/2026, ponto 13).
  it('tem quatro telas, e nenhuma delas relista a outra', () => {
    const menu = adminSectionMenu(SLUG, `${BASE}/financeiro`)

    expect(menu.map((g) => g.label)).toEqual(['Financeiro'])
    expect(menu[0]!.itens.map((i) => i.label)).toEqual([
      'Gastos',
      'Planejar',
      'Fornecedores',
      'Pagamentos',
    ])
  })

  // `exact` em Gastos protege Pagamentos; o planejamento precisa da mesma prova,
  // porque também é subrota da raiz do módulo.
  it('Gastos não acende dentro do planejamento por categoria', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const gastos = financeiro.itens.find((i) => i.label === 'Gastos')!
    const categorias = financeiro.itens.find((i) => i.label === 'Planejar')!

    expect(ehItemAtivo(gastos, rota(`${BASE}/financeiro/categorias`))).toBe(false)
    expect(ehItemAtivo(categorias, rota(`${BASE}/financeiro/categorias`))).toBe(true)
  })

  // `exact` em Gastos, senão ele ficaria aceso dentro de Pagamentos, que é
  // subrota dele.
  it('Gastos acende na raiz do módulo, não em Pagamentos', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const gastos = financeiro.itens.find((i) => i.label === 'Gastos')!

    expect(ehItemAtivo(gastos, rota(`${BASE}/financeiro`))).toBe(true)
    expect(ehItemAtivo(gastos, rota(`${BASE}/financeiro/pagamentos`))).toBe(false)
  })

  // A ficha é filha da lista: quem está lendo um gasto continua "em Gastos",
  // senão o menu apaga inteiro no exato momento em que se abre um objeto.
  it('a ficha do gasto mantém Gastos aceso', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const gastos = financeiro.itens.find((i) => i.label === 'Gastos')!

    expect(ehItemAtivo(gastos, rota(`${BASE}/financeiro/gastos/uuid-do-gasto`))).toBe(true)
  })

  // A tela de Pagamentos guarda o recorte na URL (`?filtro=vencidos`). Um
  // filtro nunca pode apagar o item de menu que o recebeu.
  it('Pagamentos continua aceso com o filtro na URL', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const pagamentos = financeiro.itens.find((i) => i.label === 'Pagamentos')!

    expect(
      ehItemAtivo(pagamentos, rota(`${BASE}/financeiro/pagamentos`, { filtro: 'vencidos' })),
    ).toBe(true)
  })
})

describe('menu da seção de Configurações', () => {
  it.each(['/configuracoes', '/cronograma', '/galeria'])(
    'desenha a coluna do módulo em %s',
    (caminho) => {
      expect(adminSectionMenu(SLUG, `${BASE}${caminho}`).length).toBeGreaterThan(0)
    },
  )

  // As abas que ficavam no topo são os grupos; as âncoras que ficavam numa
  // coluna dentro da página são os itens.
  it('vira um grupo por assunto, mais as páginas do site', () => {
    // Derivado do catálogo, e não uma segunda lista escrita à mão: o que este
    // teste afirma é que TODO assunto vira coluna, na ordem do catálogo. Com a
    // lista repetida aqui, acrescentar um assunto quebrava o teste sem nada
    // estar errado — e a correção óbvia (colar o nome novo) não verificava nada.
    expect(adminSectionMenu(SLUG, `${BASE}/configuracoes`).map((g) => g.label)).toEqual([
      ...SETTINGS_ASSUNTOS.map((assunto) => assunto.label),
      'Páginas do site',
    ])
  })

  it('leva Cronograma e Galeria para dentro do módulo', () => {
    const paginas = adminSectionMenu(SLUG, `${BASE}/configuracoes`).find(
      (g) => g.label === 'Páginas do site',
    )
    expect(paginas?.itens.map((i) => i.label)).toEqual(['Cronograma', 'Galeria'])
  })

  // Cada seção tem query própria, então o item aceso é exatamente um — se a
  // query fosse do assunto, os dois itens de "RSVP e convidados" acenderiam
  // juntos. Varre o menu INTEIRO, e não um grupo: o que se afirma é que um só
  // item acende em toda a coluna.
  it('acende só a seção pedida, não o assunto inteiro', () => {
    const itens = adminSectionMenu(SLUG, `${BASE}/configuracoes`).flatMap((g) => g.itens)
    const naFaixa = rota(`${BASE}/configuracoes`, {
      [QUERY_SECAO_CONFIGURACOES]: 'faixas-etarias',
    })
    const acesos = itens.filter((item) => ehItemAtivo(item, naFaixa))

    expect(acesos.map((i) => i.label)).toEqual(['Faixas etárias'])
  })

  it('todo item de seção tem ícone — o menu recolhido só mostra ícone', () => {
    const itens = adminSectionMenu(SLUG, `${BASE}/configuracoes`).flatMap((g) => g.itens)
    expect(itens.every((item) => Boolean(item.icon))).toBe(true)
  })
})

describe('assuntoDaSecao', () => {
  it('acha o assunto que contém a seção', () => {
    expect(assuntoDaSecao('faixas-etarias').id).toBe('rsvp')
    expect(assuntoDaSecao('tema').id).toBe('aparencia')
    expect(assuntoDaSecao('acessos').id).toBe('colaboradores')
  })

  // Sem seção na URL, ou com uma seção que não existe mais, a tela abre no
  // primeiro assunto em vez de ficar vazia.
  it.each([null, undefined, 'secao-que-nao-existe'])('cai no primeiro assunto com %s', (valor) => {
    expect(assuntoDaSecao(valor).id).toBe(SETTINGS_ASSUNTOS[0].id)
  })

  it('todo id de seção é único entre os assuntos', () => {
    const ids = SETTINGS_ASSUNTOS.flatMap((a) => a.secoes.map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
