import type { RsvpStatus } from '#shared/utils/rsvp-status'

/**
 * Os números de Mesas — todos derivados, nenhum gravado.
 *
 * Não existe `mesas.ocupacao`: sentar e tirar acontecem em vários caminhos (a
 * mesa, a lista, a exclusão de um convidado, a importação), e um contador
 * materializado erraria no primeiro que esquecesse de atualizá-lo. É a mesma
 * lição de `convites.status_convite`.
 *
 * Funções puras sobre as linhas, testadas com os casos de borda que a tela não
 * mostra todo dia: mesa vazia, mesa acima da capacidade, ocupante que recusou,
 * avulso sem convidado correspondente.
 */

export interface MesaParaCalculo {
  id: string
  capacidade: number
}

/**
 * Quem ocupa um lugar. Junta convidado e acompanhante avulso porque para a
 * mesa os dois são a mesma coisa — uma pessoa sentada. `statusRsvp` nulo é o
 * avulso: ele só existe porque alguém já confirmou por ele.
 */
export interface OcupanteParaCalculo {
  id: string
  mesaId: string | null
  statusRsvp: RsvpStatus | null
}

export interface ResumoDaMesa {
  ocupacao: number
  /** Lugares sobrando. Zero quando a mesa está cheia ou acima da capacidade. */
  livres: number
  /** Quantos passam da capacidade. Zero quando cabe. */
  excedente: number
  /** Ocupantes que já disseram que não vão — sinalizados, nunca removidos. */
  naoVao: number
}

/**
 * Quem recusou **continua sentado** e é sinalizado.
 *
 * Retirar sozinho apagaria trabalho do casal por causa de uma resposta que
 * ainda pode mudar — e a mesa é montada semanas antes de o RSVP fechar. O que
 * muda é só a leitura: ele conta na ocupação (está ali, na lista impressa) e
 * sai de "falta acomodar" (não há o que acomodar).
 */
export function resumoDaMesa(
  mesa: MesaParaCalculo,
  ocupantes: readonly OcupanteParaCalculo[],
): ResumoDaMesa {
  const daMesa = ocupantes.filter((pessoa) => pessoa.mesaId === mesa.id)
  const ocupacao = daMesa.length

  return {
    ocupacao,
    // Piso em zero nos DOIS: uma mesa com 10 em 8 lugares tem 0 livres e 2
    // excedentes, nunca -2 livres. Número negativo obrigaria cada leitor a
    // saber o que o sinal significa.
    livres: Math.max(0, mesa.capacidade - ocupacao),
    excedente: Math.max(0, ocupacao - mesa.capacidade),
    naoVao: daMesa.filter((pessoa) => pessoa.statusRsvp === 'recusado').length,
  }
}

export interface ResumoDoSalao {
  totalMesas: number
  capacidadeTotal: number
  sentados: number
  livres: number
  /** Pessoas sem mesa que ainda precisam de lugar — recusados não contam. */
  faltaAcomodar: number
  mesasAcimaDaCapacidade: number
}

export function resumoDoSalao(
  mesas: readonly MesaParaCalculo[],
  ocupantes: readonly OcupanteParaCalculo[],
): ResumoDoSalao {
  const resumos = mesas.map((mesa) => resumoDaMesa(mesa, ocupantes))

  return {
    totalMesas: mesas.length,
    capacidadeTotal: mesas.reduce((soma, mesa) => soma + mesa.capacidade, 0),
    sentados: ocupantes.filter((pessoa) => pessoa.mesaId !== null).length,
    // Somado dos resumos POR MESA, e não `capacidadeTotal - sentados`: com o
    // piso aplicado por linha, uma mesa com 2 lugares vagos e outra com 2
    // pessoas a mais dão 2 livres e 2 excedentes — somando primeiro, as duas
    // anomalias se cancelariam e o total diria "0 livres, nada demais".
    // Mesmo princípio do "piso em zero por linha" do Financeiro.
    livres: resumos.reduce((soma, resumo) => soma + resumo.livres, 0),
    faltaAcomodar: ocupantes.filter(
      (pessoa) => pessoa.mesaId === null && pessoa.statusRsvp !== 'recusado',
    ).length,
    mesasAcimaDaCapacidade: resumos.filter((resumo) => resumo.excedente > 0).length,
  }
}

/**
 * A área que a planta precisa desenhar, em centímetros.
 *
 * Com as medidas do salão, são elas. Sem elas (estado válido, não pendência),
 * a área se ajusta ao conteúdo: o canto mais distante de qualquer mesa ou
 * elemento, mais uma margem. É o que faz a planta funcionar no primeiro dia,
 * antes de o casal saber quanto mede o salão.
 */
export function areaDaPlanta(
  salao: { larguraCm: number | null; profundidadeCm: number | null },
  pecas: readonly {
    posicaoXCm: number
    posicaoYCm: number
    larguraCm: number
    profundidadeCm: number
  }[],
  margemCm = 200,
): { larguraCm: number; profundidadeCm: number; definida: boolean } {
  if (salao.larguraCm && salao.profundidadeCm) {
    return { larguraCm: salao.larguraCm, profundidadeCm: salao.profundidadeCm, definida: true }
  }

  // Mínimo de 10x8 m mesmo sem nada: uma planta de área zero não tem onde
  // receber a primeira mesa arrastada.
  let largura = 1000
  let profundidade = 800

  for (const peca of pecas) {
    largura = Math.max(largura, peca.posicaoXCm + peca.larguraCm + margemCm)
    profundidade = Math.max(profundidade, peca.posicaoYCm + peca.profundidadeCm + margemCm)
  }

  return { larguraCm: largura, profundidadeCm: profundidade, definida: false }
}

/**
 * Mantém a peça dentro da área ao arrastar.
 *
 * Coordenada negativa não existe (o CHECK do banco recusa), e deixar a mesa
 * sair pela direita a esconderia atrás da borda com o casal achando que ela
 * sumiu.
 */
export function limitarNaArea(
  posicao: { x: number; y: number },
  peca: { larguraCm: number; profundidadeCm: number },
  area: { larguraCm: number; profundidadeCm: number },
): { x: number; y: number } {
  return {
    x: Math.round(Math.min(Math.max(0, posicao.x), Math.max(0, area.larguraCm - peca.larguraCm))),
    y: Math.round(
      Math.min(Math.max(0, posicao.y), Math.max(0, area.profundidadeCm - peca.profundidadeCm)),
    ),
  }
}
