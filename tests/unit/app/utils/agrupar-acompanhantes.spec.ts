import { describe, expect, it } from 'vitest'
import { montarPreviaDoAgrupamento } from '~/utils/agrupar-acompanhantes'

/**
 * Estes números são o aviso que o casal lê antes de confirmar. Se eles
 * descreverem outra coisa que não a operação, o aviso é pior que aviso nenhum
 * — daí a cobertura caso a caso.
 */
function pessoa(
  id: string,
  nucleo_id: string | null = null,
  convite_id: string | null = null,
  em_consideracao = false,
) {
  return { id, nucleo_id, convite_id, em_consideracao }
}

describe('montarPreviaDoAgrupamento', () => {
  it('duas pessoas soltas: nada além do que foi pedido', () => {
    const previa = montarPreviaDoAgrupamento([pessoa('a'), pessoa('b')], ['a', 'b'])

    expect(previa).toEqual({
      total: 2,
      arrastados: 0,
      nucleosFundidos: 0,
      ganhamConvite: 0,
      convitesDiferentes: false,
      temRascunho: false,
    })
  })

  it('quem já está num núcleo traz o núcleo inteiro', () => {
    // João e Maria são um núcleo; agrupar João com Pedro resulta no trio, não
    // no par novo — senão agrupar afastaria a Maria do João.
    const previa = montarPreviaDoAgrupamento(
      [pessoa('joao', 'n1'), pessoa('maria', 'n1'), pessoa('pedro')],
      ['joao', 'pedro'],
    )

    expect(previa.total).toBe(3)
    expect(previa.arrastados).toBe(1)
    // Um núcleo só não é fusão: é entrar no que já existe.
    expect(previa.nucleosFundidos).toBe(0)
  })

  it('conta a fusão quando a seleção pega núcleos diferentes', () => {
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a', 'n1'), pessoa('b', 'n1'), pessoa('c', 'n2'), pessoa('d', 'n2')],
      ['a', 'c'],
    )

    expect(previa.total).toBe(4)
    expect(previa.arrastados).toBe(2)
    expect(previa.nucleosFundidos).toBe(2)
  })

  it('conta quem passa a ter convite — é o que habilita responder ao RSVP', () => {
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a', null, 'convite-1'), pessoa('b'), pessoa('c')],
      ['a', 'b', 'c'],
    )

    expect(previa.ganhamConvite).toBe(2)
    expect(previa.convitesDiferentes).toBe(false)
  })

  it('não conta ganho de convite quando ninguém da seleção tem convite', () => {
    const previa = montarPreviaDoAgrupamento([pessoa('a'), pessoa('b')], ['a', 'b'])

    expect(previa.ganhamConvite).toBe(0)
  })

  it('acusa convites diferentes — a operação é recusada, não resolvida por merge', () => {
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a', null, 'convite-1'), pessoa('b', null, 'convite-2')],
      ['a', 'b'],
    )

    expect(previa.convitesDiferentes).toBe(true)
    // Sem convite único, "quantos ganham convite" não tem resposta.
    expect(previa.ganhamConvite).toBe(0)
  })

  it('acha o convite conflitante mesmo quando ele entra por arrasto de núcleo', () => {
    // Só "a" e "c" foram marcados, e nenhum dos dois tem convite: o conflito
    // vem da Maria ("b"), que entra junto por compartilhar o núcleo de "a".
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a', 'n1'), pessoa('b', 'n1', 'convite-1'), pessoa('c', null, 'convite-2')],
      ['a', 'c'],
    )

    expect(previa.convitesDiferentes).toBe(true)
  })

  it('acusa rascunho da lista: quem está em consideração nunca recebe convite', () => {
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a'), pessoa('b', null, null, true)],
      ['a', 'b'],
    )

    expect(previa.temRascunho).toBe(true)
  })

  it('acusa rascunho que entra por arrasto, não só o marcado', () => {
    const previa = montarPreviaDoAgrupamento(
      [pessoa('a', 'n1'), pessoa('rascunho', 'n1', null, true), pessoa('c')],
      ['a', 'c'],
    )

    expect(previa.temRascunho).toBe(true)
  })

  it('ignora id selecionado que não está na lista carregada', () => {
    const previa = montarPreviaDoAgrupamento([pessoa('a')], ['a', 'fantasma'])

    expect(previa.total).toBe(1)
    expect(previa.arrastados).toBe(0)
  })
})
