import { describe, expect, it, vi } from 'vitest'
import { criarFilaDeQuery } from '~/utils/table-filters'

/**
 * A corrida que esta fila paga: digitar no filtro e clicar numa linha dentro
 * da janela do debounce fazia o modal não abrir, porque o `router.replace` do
 * filtro abortava o `router.push` do clique.
 *
 * O teste E2E equivalente foi escrito e descartado por ser instável por
 * construção — a falha só aparecia sob contenção. Aqui a mesma regra é
 * verificada sem depender de tempo nenhum: o que existe é a ordem dos eventos.
 */
describe('criarFilaDeQuery', () => {
  it('escreve na hora quando ninguém está navegando', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.enfileirar({ nome: 'ana' })

    expect(escrever).toHaveBeenCalledWith({ nome: 'ana' })
  })

  it('CEDE A PASSAGEM: não escreve enquanto uma navegação está em voo', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.enfileirar({ nome: 'ana' })

    expect(escrever).not.toHaveBeenCalled()
    expect(fila.pendente).toBe(true)
  })

  it('reaplica o patch quando a navegação assenta', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.enfileirar({ nome: 'ana' })
    fila.aoTerminar()

    expect(escrever).toHaveBeenCalledWith({ nome: 'ana' })
    expect(fila.pendente).toBe(false)
  })

  it('acumula vários patches numa escrita só, sem perder nenhum', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.enfileirar({ nome: 'an' })
    fila.enfileirar({ nome: 'ana' })
    fila.enfileirar({ ordenar: 'nome' })
    fila.aoTerminar()

    expect(escrever).toHaveBeenCalledTimes(1)
    expect(escrever).toHaveBeenCalledWith({ nome: 'ana', ordenar: 'nome' })
  })

  it('o patch mais novo vence o mais velho da mesma chave', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.enfileirar({ nome: 'ana' })
    fila.enfileirar({ nome: undefined })
    fila.aoTerminar()

    expect(escrever).toHaveBeenCalledWith({ nome: undefined })
  })

  it('não repete o despejo na navegação que a própria escrita dispara', () => {
    // `escrever` navega, então `aoIniciar`/`aoTerminar` voltam a ser chamados.
    // Sem zerar o acumulado antes de escrever, isto seria um laço infinito.
    const escrever = vi.fn(() => {
      fila.aoIniciar()
      fila.aoTerminar()
    })
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.enfileirar({ nome: 'ana' })
    fila.aoTerminar()

    expect(escrever).toHaveBeenCalledTimes(1)
  })

  it('navegação que falha também libera a fila — ela nunca fica presa', () => {
    // `afterEach` do Vue Router roda inclusive quando a navegação é abortada,
    // e é isso que impede o filtro de parar de funcionar depois de uma delas.
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.aoTerminar()
    fila.enfileirar({ nome: 'ana' })

    expect(escrever).toHaveBeenCalledWith({ nome: 'ana' })
  })

  it('nada é escrito quando não houve pedido durante a navegação', () => {
    const escrever = vi.fn()
    const fila = criarFilaDeQuery(escrever)

    fila.aoIniciar()
    fila.aoTerminar()

    expect(escrever).not.toHaveBeenCalled()
  })
})
