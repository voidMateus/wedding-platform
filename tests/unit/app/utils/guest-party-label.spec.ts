import { describe, expect, it } from 'vitest'
import { montarRotulosDeNucleo } from '../../../../app/utils/guest-party-label'

function membro(nucleo_id: string | null, nome_completo: string, ordem_nucleo: number) {
  return { nucleo_id, nome_completo, ordem_nucleo }
}

describe('montarRotulosDeNucleo', () => {
  it('une os dois primeiros nomes do núcleo', () => {
    const rotulos = montarRotulosDeNucleo([
      membro('n1', 'João da Silva', 0),
      membro('n1', 'Maria da Silva', 1),
    ])

    expect(rotulos.get('n1')).toBe('João e Maria')
  })

  // O sobrenome se repete dentro do núcleo, então é o primeiro nome que
  // identifica quem é quem.
  it('usa só o primeiro nome', () => {
    const rotulos = montarRotulosDeNucleo([membro('n1', 'Maria Eduarda dos Santos', 0)])

    expect(rotulos.get('n1')).toBe('Maria')
  })

  it('resume o excedente em "+N" em vez de listar o núcleo inteiro', () => {
    const rotulos = montarRotulosDeNucleo([
      membro('n1', 'João da Silva', 0),
      membro('n1', 'Maria da Silva', 1),
      membro('n1', 'Pedro da Silva', 2),
      membro('n1', 'Ana da Silva', 3),
    ])

    expect(rotulos.get('n1')).toBe('João e Maria +2')
  })

  // O principal é sempre `ordem_nucleo` 0: o rótulo tem que começar por ele,
  // qualquer que seja a ordem em que as linhas chegaram do banco.
  it('respeita ordem_nucleo, não a ordem de chegada', () => {
    const rotulos = montarRotulosDeNucleo([
      membro('n1', 'Ana da Silva', 3),
      membro('n1', 'Maria da Silva', 1),
      membro('n1', 'João da Silva', 0),
    ])

    expect(rotulos.get('n1')).toBe('João e Maria +1')
  })

  it('ignora quem não está em núcleo nenhum', () => {
    const rotulos = montarRotulosDeNucleo([
      membro(null, 'Solteiro Silva', 0),
      membro('n1', 'João da Silva', 0),
    ])

    expect(rotulos.size).toBe(1)
    expect(rotulos.has('n1')).toBe(true)
  })

  it('separa núcleos diferentes', () => {
    const rotulos = montarRotulosDeNucleo([
      membro('n1', 'João da Silva', 0),
      membro('n2', 'Carlos Souza', 0),
      membro('n2', 'Fernanda Souza', 1),
    ])

    expect(rotulos.get('n1')).toBe('João')
    expect(rotulos.get('n2')).toBe('Carlos e Fernanda')
  })
})
