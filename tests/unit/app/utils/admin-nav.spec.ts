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
  // a chegada do Financeiro são cinco destinos: a barra do celular mostra os
  // quatro primeiros e joga Configurações no "Mais" — por isso a ORDEM aqui é
  // parte do contrato, não detalhe de escrita.
  it('mantém as cinco abas de módulo no topo, nesta ordem', () => {
    expect(adminPrimaryNav(SLUG).map((i) => i.label)).toEqual([
      'Início',
      'Convidados',
      'Presentes',
      'Financeiro',
      'Configurações',
    ])
  })

  it.each(['/financeiro', '/financeiro/orcamento', '/financeiro/fornecedores'])(
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

describe('menu da seção', () => {
  it.each(['/convidados', '/convidados/lista', '/grupos', '/convites'])(
    'desenha a coluna do módulo em %s',
    (caminho) => {
      expect(adminSectionMenu(SLUG, `${BASE}${caminho}`).length).toBeGreaterThan(0)
    },
  )

  it('não desenha coluna onde a seção não tem menu', () => {
    expect(adminSectionMenu(SLUG, `${BASE}/presentes`)).toEqual([])
  })

  it('leva Convites para Gerenciar, junto de Grupos', () => {
    const gerenciar = adminSectionMenu(SLUG, `${BASE}/convidados`).find(
      (g) => g.label === 'Gerenciar',
    )
    expect(gerenciar?.itens.map((i) => i.label)).toEqual([
      'Grupos',
      'Convites',
      'Núcleos',
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
    const gerenciar = adminSectionMenu(SLUG, `${BASE}/convidados`).find(
      (g) => g.label === 'Gerenciar',
    )!
    const nucleos = gerenciar.itens.find((i) => i.label === 'Núcleos')!

    expect(nucleos.to).toBeUndefined()
    expect(ehItemAtivo(nucleos, rota(`${BASE}/convidados`))).toBe(false)
  })
})

describe('menu da seção do Financeiro', () => {
  it.each(['/financeiro', '/financeiro/orcamento', '/financeiro/documentos'])(
    'desenha a coluna do módulo em %s',
    (caminho) => {
      expect(adminSectionMenu(SLUG, `${BASE}${caminho}`).length).toBeGreaterThan(0)
    },
  )

  it('separa a leitura (Visão geral, Orçamento) do cadastro (Gerenciar)', () => {
    expect(adminSectionMenu(SLUG, `${BASE}/financeiro`).map((g) => g.label)).toEqual([
      'Financeiro',
      'Gerenciar',
    ])
  })

  // `exact` na Visão geral, senão ela ficaria acesa dentro de Orçamento,
  // Fornecedores e Documentos — que são subrotas dela.
  it('Visão geral acende só na raiz do módulo', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const visaoGeral = financeiro.itens.find((i) => i.label === 'Visão geral')!

    expect(ehItemAtivo(visaoGeral, rota(`${BASE}/financeiro`))).toBe(true)
    expect(ehItemAtivo(visaoGeral, rota(`${BASE}/financeiro/orcamento`))).toBe(false)
  })

  // O bloco de atenção da Visão geral leva ao Orçamento com `?vencimento=`.
  // Um filtro na URL nunca pode apagar o item que o recebe.
  it('Orçamento continua aceso com o recorte de vencimento na URL', () => {
    const financeiro = adminSectionMenu(SLUG, `${BASE}/financeiro`)[0]!
    const orcamento = financeiro.itens.find((i) => i.label === 'Orçamento')!

    expect(
      ehItemAtivo(orcamento, rota(`${BASE}/financeiro/orcamento`, { vencimento: 'vencidos' })),
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
    expect(adminSectionMenu(SLUG, `${BASE}/configuracoes`).map((g) => g.label)).toEqual([
      'Geral',
      'Aparência',
      'Conteúdo',
      'Colaboradores',
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
  // query fosse do assunto, os quatro itens de Geral acenderiam juntos.
  it('acende só a seção pedida, não o assunto inteiro', () => {
    const geral = adminSectionMenu(SLUG, `${BASE}/configuracoes`)[0]!
    const naFaixa = rota(`${BASE}/configuracoes`, {
      [QUERY_SECAO_CONFIGURACOES]: 'faixas-etarias',
    })
    const acesos = geral.itens.filter((item) => ehItemAtivo(item, naFaixa))

    expect(acesos.map((i) => i.label)).toEqual(['Classificação etária'])
  })

  it('todo item de seção tem ícone — o menu recolhido só mostra ícone', () => {
    const itens = adminSectionMenu(SLUG, `${BASE}/configuracoes`).flatMap((g) => g.itens)
    expect(itens.every((item) => Boolean(item.icon))).toBe(true)
  })
})

describe('assuntoDaSecao', () => {
  it('acha o assunto que contém a seção', () => {
    expect(assuntoDaSecao('faixas-etarias').id).toBe('geral')
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
