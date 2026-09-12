import { describe, expect, it } from 'vitest'
import { CATEGORIAS_ORCAMENTO_SUGERIDAS } from '#shared/orcamento-categorias'
import { TAMANHO_PALETA_CATEGORIAS, corDaCategoria } from '#shared/utils/paleta-categorias'

/**
 * O catálogo é a única vez em que a plataforma opina sobre o casamento de
 * alguém: é o que aparece quando o casal abre o Financeiro pela primeira vez.
 * Os testes aqui travam as regras que não dá para ver lendo a lista.
 */
describe('categorias sugeridas', () => {
  it('cabe na paleta — o catálogo padrão nunca nasce com duas cores iguais', () => {
    // A partir do slot 12 as cores se repetem. Repetição é aceitável quando o
    // casal chega lá sozinho; no que a plataforma sugere, é defeito de fábrica.
    expect(CATEGORIAS_ORCAMENTO_SUGERIDAS.length).toBeLessThanOrEqual(TAMANHO_PALETA_CATEGORIAS)

    const cores = CATEGORIAS_ORCAMENTO_SUGERIDAS.map(
      (_, indice) => corDaCategoria(indice, '#7b2d3b').solida,
    )
    expect(new Set(cores).size).toBe(CATEGORIAS_ORCAMENTO_SUGERIDAS.length)
  })

  it('não repete nome — o índice único do banco recusaria a semeadura inteira', () => {
    const nomes = CATEGORIAS_ORCAMENTO_SUGERIDAS.map((categoria) => categoria.nome.toLowerCase())
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  it('a ordem de exibição é 0..n sem buraco', () => {
    const ordens = CATEGORIAS_ORCAMENTO_SUGERIDAS.map((categoria) => categoria.ordemExibicao)
    expect(ordens).toEqual(CATEGORIAS_ORCAMENTO_SUGERIDAS.map((_, indice) => indice))
  })

  it('não tem um balde de sobras — a tela já agrupa o que não tem categoria', () => {
    // "Outros" existiu aqui e duplicava o "Sem categoria" que o próprio
    // agrupamento produz: dois baldes com o mesmo significado obrigam o casal
    // a escolher entre eles, e o mesmo gasto acaba em lugares diferentes.
    const sobras = CATEGORIAS_ORCAMENTO_SUGERIDAS.filter((categoria) =>
      ['outros', 'diversos', 'extras'].includes(categoria.nome.toLowerCase()),
    )
    expect(sobras).toEqual([])
  })

  it('cobre as linhas caras que uma checklist de cerimonial traz', () => {
    // Confronto com a checklist de fornecedores de uma cerimonial em atividade
    // (2026-09-12). Estas três faltavam, e caíam todas em "Outros".
    const nomes = CATEGORIAS_ORCAMENTO_SUGERIDAS.map((categoria) => categoria.nome)
    expect(nomes).toContain('Cerimônia e assessoria')
    expect(nomes).toContain('Atrativos da festa')
    expect(nomes).toContain('Espaço e estrutura')
  })
})
