import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { AdminTableSection } from '~/types/table'

/**
 * Montagem dos blocos do Modo Lista a partir da hierarquia de grupos.
 *
 * Função pura, fora da página, porque é a regra que define o que o casal vê:
 * quais blocos existem, em que ordem, e o que cada contagem descreve. Testar
 * isso montando a tela seria testar por tabela renderizada.
 */

/** Só o que a árvore precisa — serve para `Group` e para `GroupListItem`. */
interface GrupoDaArvore {
  id: string
  nome: string
  grupo_pai_id: string | null
  /** Cor da etiqueta, desenhada como ponto no cabeçalho do bloco. */
  cor?: string | null
}

interface ConvidadoAgrupavel {
  id: string
  grupo_id: string | null
  /** Obrigatório: é o cabeçalho do bloco que anuncia quantos já confirmaram. */
  status_rsvp: RsvpStatus
}

/**
 * Bloco de quem não tem grupo. Prefixado para nunca colidir com um uuid de
 * `grupos` — o id de bloco é a chave de recolher, e uma colisão faria dois
 * blocos abrirem e fecharem juntos.
 */
export const SECAO_SEM_GRUPO = '__sem-grupo__'

export interface OpcoesSecoes {
  /**
   * Bloco sem ninguém sai da lista. A página liga isso quando há filtro
   * ativo: com recorte aplicado, uma parede de grupos vazios esconderia os
   * poucos que casaram. Sem filtro, grupo vazio continua aparecendo — ele
   * existe, e é onde o casal vai querer adicionar gente.
   */
  esconderVazios?: boolean
  /** Ids dos blocos recolhidos, para não desenhar subdivisão de pai fechado. */
  recolhidos?: readonly string[]
}

/**
 * "5/12 confirmados" — a MESMA forma da tela de Grupos, de propósito.
 *
 * A fração diz total e confirmados de uma vez, então não precisa de "12
 * pessoas" ao lado. E o vocabulário é o que a plataforma já usa: inventar uma
 * segunda maneira de dizer a mesma coisa ("12 pessoas · 5 confirmaram") faria
 * duas telas sobre o mesmo dado falarem línguas diferentes.
 *
 * Zero em zero aparece igual em Grupos: "0/0 confirmados" é o grupo vazio, e
 * "0/12 confirmados" é exatamente o grupo a cobrar. Por isso `status_rsvp` é
 * obrigatório em `ConvidadoAgrupavel` em vez de opcional: um bloco vazio não
 * tem linha nenhuma para inspecionar, então "quem chamou tem status?" não é
 * uma pergunta que se responda contando linhas — tem que estar no tipo.
 */
function rotuloDoBloco(total: number, confirmados: number): string {
  return `${confirmados}/${total} confirmados`
}

function contarConfirmados<T extends ConvidadoAgrupavel>(linhas: readonly T[]): number {
  return linhas.filter((linha) => linha.status_rsvp === 'confirmado').length
}

export function montarSecoesDeConvidados<T extends ConvidadoAgrupavel>(
  convidados: readonly T[],
  grupos: readonly GrupoDaArvore[],
  opcoes: OpcoesSecoes = {},
): AdminTableSection<T>[] {
  const { esconderVazios = false, recolhidos = [] } = opcoes

  const porGrupo = new Map<string, T[]>()
  const semGrupo: T[] = []
  for (const convidado of convidados) {
    if (!convidado.grupo_id) {
      semGrupo.push(convidado)
      continue
    }
    const lista = porGrupo.get(convidado.grupo_id) ?? []
    lista.push(convidado)
    porGrupo.set(convidado.grupo_id, lista)
  }

  const porNome = (a: GrupoDaArvore, b: GrupoDaArvore) => a.nome.localeCompare(b.nome, 'pt-BR')
  const raizes = grupos.filter((grupo) => !grupo.grupo_pai_id).sort(porNome)

  const secoes: AdminTableSection<T>[] = []

  for (const raiz of raizes) {
    const subdivisoes = grupos.filter((grupo) => grupo.grupo_pai_id === raiz.id).sort(porNome)
    const linhasDaRaiz = porGrupo.get(raiz.id) ?? []

    // O convidado aponta sempre para a folha, então o grupo-pai não tem
    // ninguém "por herança": a contagem do cabeçalho é a soma dele com as
    // subdivisões. Sem isso "Família do Mateus" anunciaria 0 pessoas com 32
    // logo abaixo.
    // A árvore inteira, e não só a contagem: a confirmação do cabeçalho da
    // raiz precisa do MESMO rollup do total, senão "Família do Mateus" diria
    // "0 confirmaram" com dezoito confirmados nas subdivisões logo abaixo.
    const linhasDaArvore = [
      ...linhasDaRaiz,
      ...subdivisoes.flatMap((sub) => porGrupo.get(sub.id) ?? []),
    ]
    const totalDaRaiz = linhasDaArvore.length

    if (esconderVazios && totalDaRaiz === 0) continue

    secoes.push({
      id: raiz.id,
      label: raiz.nome,
      level: 0,
      meta: rotuloDoBloco(totalDaRaiz, contarConfirmados(linhasDaArvore)),
      icon: 'lucide:users-round',
      cor: raiz.cor ?? null,
      rows: linhasDaRaiz,
    })

    // Recolher o pai tem que recolher a árvore. A `AdminTable` só esconde as
    // linhas do próprio bloco, então a subdivisão de um pai fechado não pode
    // nem chegar até ela — senão o cabeçalho da subdivisão continuaria na tela
    // pendurado em nada.
    if (recolhidos.includes(raiz.id)) continue

    for (const sub of subdivisoes) {
      const linhas = porGrupo.get(sub.id) ?? []
      if (esconderVazios && !linhas.length) continue

      secoes.push({
        id: sub.id,
        label: sub.nome,
        level: 1,
        meta: rotuloDoBloco(linhas.length, contarConfirmados(linhas)),
        cor: sub.cor ?? null,
        rows: linhas,
      })
    }
  }

  // Sempre por último: é o resto da lista, não um grupo. Só aparece quando há
  // alguém ali — um bloco "Sem grupo" vazio não informa nada.
  if (semGrupo.length) {
    secoes.push({
      id: SECAO_SEM_GRUPO,
      label: 'Sem grupo',
      level: 0,
      meta: rotuloDoBloco(semGrupo.length, contarConfirmados(semGrupo)),
      icon: 'lucide:user',
      rows: semGrupo,
    })
  }

  return secoes
}
