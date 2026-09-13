import { describe, expect, it } from 'vitest'
import { CATEGORIAS_ORCAMENTO_SUGERIDAS } from '#shared/orcamento-categorias'
import { ITENS_SUGERIDOS_POR_CATEGORIA, sugestoesQueFaltam } from '#shared/orcamento-itens'

/**
 * O catálogo de itens é o "norte" de quem não sabe começar. Os testes aqui
 * travam o que não dá para ver lendo a lista — principalmente o vínculo com as
 * categorias, que é por NOME e portanto silencioso quando quebra.
 */
describe('itens sugeridos por categoria', () => {
  const nomesDeCategoria = CATEGORIAS_ORCAMENTO_SUGERIDAS.map((categoria) => categoria.nome)

  it('toda chave é uma categoria do catálogo — sugestão órfã nunca aparece', () => {
    // O casamento entre os dois arquivos é por string. Um nome renomeado num
    // deles e não no outro não quebra nada em runtime: a categoria só deixa de
    // sugerir, em silêncio.
    for (const chave of Object.keys(ITENS_SUGERIDOS_POR_CATEGORIA)) {
      expect(nomesDeCategoria).toContain(chave)
    }
  })

  it('toda categoria sugerida tem itens — nenhuma nasce sem norte', () => {
    for (const nome of nomesDeCategoria) {
      expect(ITENS_SUGERIDOS_POR_CATEGORIA[nome]?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('não repete item dentro da mesma categoria', () => {
    for (const [nome, itens] of Object.entries(ITENS_SUGERIDOS_POR_CATEGORIA)) {
      const normalizados = itens.map((item) => item.toLowerCase())
      expect(new Set(normalizados).size, nome).toBe(itens.length)
    }
  })

  it('some o que o casal já cadastrou, sem se importar com maiúscula', () => {
    const faltam = sugestoesQueFaltam('Bebidas', ['  bar de drinks ', 'Refrigerantes'])
    expect(faltam).not.toContain('Bar de drinks')
    expect(faltam).toContain('Barril de chopp')
  })

  it('a sugestão não se esgota: o que sobrou continua sendo oferecido', () => {
    const catalogo = ITENS_SUGERIDOS_POR_CATEGORIA['Lua de mel'] ?? []
    const faltam = sugestoesQueFaltam('Lua de mel', [catalogo[0] ?? ''])
    expect(faltam.length).toBe(catalogo.length - 1)
  })

  it('categoria que o casal renomeou não recebe palpite', () => {
    expect(sugestoesQueFaltam('Bebidas do Zé', [])).toEqual([])
  })
})
