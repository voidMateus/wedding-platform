import { describe, expect, it } from 'vitest'
import { AJUDA_POR_TELA, ajudaDaRota } from '#shared/ajuda-de-tela'

const BASE = '/admin/ana-e-joao'

describe('ajuda de tela', () => {
  it('resolve a tela pela rota, ignorando o slug do casamento', () => {
    expect(ajudaDaRota(`${BASE}/mesas`)?.id).toBe('mesas')
    expect(ajudaDaRota('/admin/outro-casal/mesas')?.id).toBe('mesas')
  })

  /**
   * A ficha de um convidado é a tela de Convidados vista de perto — não é outra
   * pergunta, e receber ali um bloco diferente seria dizer que é.
   */
  it('estende a ajuda da lista às fichas dela', () => {
    expect(ajudaDaRota(`${BASE}/convidados/abc-123`)?.id).toBe('convidados')
    expect(ajudaDaRota(`${BASE}/financeiro/gastos/abc-123`)?.id).toBe('financeiro-gastos')
  })

  /**
   * O catálogo é ordenado, e o mais específico vem antes: `/financeiro` casa
   * com as filhas, então sem a ordem certa ele engoliria Pagamentos e
   * Fornecedores — e as três telas do módulo dariam a mesma explicação.
   */
  it.each([
    ['/financeiro/pagamentos', 'financeiro-pagamentos'],
    ['/financeiro/categorias', 'financeiro-planejar'],
    ['/financeiro/fornecedores', 'financeiro-fornecedores'],
    ['/financeiro', 'financeiro-gastos'],
  ])('%s resolve para %s', (caminho, id) => {
    expect(ajudaDaRota(`${BASE}${caminho}`)?.id).toBe(id)
  })

  it('devolve nulo onde não há ajuda, em vez de um bloco vazio', () => {
    expect(ajudaDaRota(`${BASE}/configuracoes`)).toBeNull()
    expect(ajudaDaRota(`${BASE}`)).toBeNull()
    expect(ajudaDaRota('/login')).toBeNull()
  })

  it('tolera a barra final', () => {
    expect(ajudaDaRota(`${BASE}/mesas/`)?.id).toBe('mesas')
  })

  /**
   * Chave duplicada faria duas telas dividirem o mesmo "visto": dispensar uma
   * apagaria a outra, e o defeito só apareceria para quem visitasse as duas.
   */
  it('não tem id repetido', () => {
    const ids = AJUDA_POR_TELA.map((entrada) => entrada.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  /** O formato é o contrato: três perguntas, sempre as três. */
  it.each(AJUDA_POR_TELA.map((entrada) => entrada.id))('%s responde as três perguntas', (id) => {
    const entrada = AJUDA_POR_TELA.find((atual) => atual.id === id)!
    expect(entrada.responde.length).toBeGreaterThan(10)
    expect(entrada.acoes.length).toBeGreaterThan(0)
    expect(entrada.comece.length).toBeGreaterThan(10)
  })
})
