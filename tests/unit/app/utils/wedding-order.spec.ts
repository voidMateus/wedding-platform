import { describe, expect, it } from 'vitest'
import { sortWeddingsByEvent } from '~/utils/wedding-order'
import type { WeddingMembership } from '~/types/auth'

const HOJE = '2026-09-15'

function membership(over: Partial<WeddingMembership> & { nomesNoivos: string }): WeddingMembership {
  return {
    weddingId: over.nomesNoivos,
    memberId: `m-${over.nomesNoivos}`,
    role: 'dono',
    slug: over.nomesNoivos.toLowerCase(),
    dataEvento: '2030-01-01',
    statusCicloVida: 'publicado',
    ...over,
  }
}

function nomes(lista: readonly WeddingMembership[]): string[] {
  return sortWeddingsByEvent(lista, HOJE).map((m) => m.nomesNoivos)
}

describe('sortWeddingsByEvent', () => {
  it('põe o próximo evento no topo, não o mais antigo', () => {
    // O defeito que a ordem existe para evitar: crescente por data põe o
    // casamento de 2020 acima do do mês que vem.
    expect(
      nomes([
        membership({ nomesNoivos: 'Longe', dataEvento: '2027-05-01' }),
        membership({ nomesNoivos: 'Passado', dataEvento: '2020-03-10' }),
        membership({ nomesNoivos: 'Perto', dataEvento: '2026-10-01' }),
      ]),
    ).toEqual(['Perto', 'Longe', 'Passado'])
  })

  it('ordena o que já passou do mais recente para o mais antigo', () => {
    expect(
      nomes([
        membership({ nomesNoivos: 'Antigo', dataEvento: '2019-01-01' }),
        membership({ nomesNoivos: 'Recente', dataEvento: '2026-08-01' }),
      ]),
    ).toEqual(['Recente', 'Antigo'])
  })

  it('manda arquivado para o fim mesmo com a data mais próxima', () => {
    expect(
      nomes([
        membership({
          nomesNoivos: 'Arquivado',
          dataEvento: '2026-09-20',
          statusCicloVida: 'arquivado',
        }),
        membership({ nomesNoivos: 'Vivo', dataEvento: '2027-01-01' }),
      ]),
    ).toEqual(['Vivo', 'Arquivado'])
  })

  it('trata o evento de hoje como futuro, nunca como passado', () => {
    expect(
      nomes([
        membership({ nomesNoivos: 'Amanhã', dataEvento: '2026-09-16' }),
        membership({ nomesNoivos: 'Hoje', dataEvento: HOJE }),
      ]),
    ).toEqual(['Hoje', 'Amanhã'])
  })

  it('desempata pelo nome quando duas festas caem no mesmo dia', () => {
    expect(
      nomes([
        membership({ nomesNoivos: 'Zuleica & Théo', dataEvento: '2027-02-06' }),
        membership({ nomesNoivos: 'Ana & Bruno', dataEvento: '2027-02-06' }),
      ]),
    ).toEqual(['Ana & Bruno', 'Zuleica & Théo'])
  })

  it('não altera o array recebido', () => {
    const lista = [
      membership({ nomesNoivos: 'B', dataEvento: '2028-01-01' }),
      membership({ nomesNoivos: 'A', dataEvento: '2027-01-01' }),
    ]
    sortWeddingsByEvent(lista, HOJE)
    expect(lista.map((m) => m.nomesNoivos)).toEqual(['B', 'A'])
  })
})
