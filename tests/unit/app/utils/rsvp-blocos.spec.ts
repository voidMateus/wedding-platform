import { describe, expect, it } from 'vitest'
import { agruparMembrosPorNucleo } from '~/utils/rsvp-blocos'

function membro(guestId: string, partyId: string | null = null) {
  return { guestId, partyId }
}

describe('agruparMembrosPorNucleo', () => {
  it('quem não tem núcleo vira um bloco de um', () => {
    const blocos = agruparMembrosPorNucleo([membro('a'), membro('b')])

    expect(blocos.map((bloco) => bloco.membros.map((m) => m.guestId))).toEqual([['a'], ['b']])
  })

  it('junta o núcleo inteiro num bloco só', () => {
    const blocos = agruparMembrosPorNucleo([
      membro('joao', 'casal'),
      membro('maria', 'casal'),
      membro('pedro'),
    ])

    expect(blocos.map((bloco) => bloco.membros.map((m) => m.guestId))).toEqual([
      ['joao', 'maria'],
      ['pedro'],
    ])
  })

  // Um convite pode conter vários núcleos (três casais sob o mesmo cartão) —
  // dois blocos colados não podem virar um.
  it('não funde núcleos diferentes que chegam colados', () => {
    const blocos = agruparMembrosPorNucleo([
      membro('ana', 'casal-1'),
      membro('bia', 'casal-1'),
      membro('caio', 'casal-2'),
      membro('duda', 'casal-2'),
    ])

    expect(blocos).toHaveLength(2)
    expect(blocos.map((bloco) => bloco.id)).toEqual(['ana', 'caio'])
  })

  // Só acontece se a ordenação do servidor falhar, e é exatamente por isso que
  // a chave do bloco é o primeiro `guestId` e não o `partyId`: com o id do
  // núcleo, os dois trechos teriam a MESMA chave de lista.
  it('núcleo partido em dois trechos rende dois blocos com chaves distintas', () => {
    const blocos = agruparMembrosPorNucleo([
      membro('joao', 'casal'),
      membro('pedro'),
      membro('maria', 'casal'),
    ])

    expect(blocos.map((bloco) => bloco.id)).toEqual(['joao', 'pedro', 'maria'])
    expect(new Set(blocos.map((bloco) => bloco.id)).size).toBe(blocos.length)
  })

  it('lista vazia não rende bloco nenhum', () => {
    expect(agruparMembrosPorNucleo([])).toEqual([])
  })
})
