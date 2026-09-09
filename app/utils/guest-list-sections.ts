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
}

interface ConvidadoAgrupavel {
  id: string
  grupo_id: string | null
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

function rotuloDePessoas(total: number): string {
  return `${total} ${total === 1 ? 'pessoa' : 'pessoas'}`
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
    const totalDaRaiz =
      linhasDaRaiz.length +
      subdivisoes.reduce((soma, sub) => soma + (porGrupo.get(sub.id)?.length ?? 0), 0)

    if (esconderVazios && totalDaRaiz === 0) continue

    secoes.push({
      id: raiz.id,
      label: raiz.nome,
      level: 0,
      meta: rotuloDePessoas(totalDaRaiz),
      icon: 'lucide:users-round',
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
        meta: rotuloDePessoas(linhas.length),
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
      meta: rotuloDePessoas(semGrupo.length),
      icon: 'lucide:user',
      rows: semGrupo,
    })
  }

  return secoes
}
