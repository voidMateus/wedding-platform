/**
 * O cálculo do Financeiro, num lugar só (docs/fase1-financeiro.md, seção 5).
 *
 * Vive em `shared/` porque endpoint e tela precisam da MESMA conta: é o que
 * impede o total do cabeçalho de discordar da soma das linhas — o mesmo motivo
 * que levou a classificação etária para `faixa-etaria.ts`.
 *
 * O dinheiro atravessa CINCO estágios, e a separação entre os dois primeiros é
 * a razão desta rodada (2026-09-11): planejar e pagar são momentos diferentes
 * do casal, e misturá-los obrigava a escrever o número do contrato antes de
 * existir contrato.
 *
 *   Orçado      teto da categoria          categorias_orcamento.valor_previsto
 *   Estimado    "acho que vai custar"      despesas.valor_estimado_centavos
 *   Contratado  "fechei por"               despesas.valor_centavos (nulo até fechar)
 *   Pago        saiu do bolso              parcelas com pago_em
 *   A pagar     contratado − pago          o que ainda vai sair
 *
 * Três regras atravessam tudo aqui:
 *
 * 1. PISO EM ZERO SEMPRE POR LINHA, ANTES DE SOMAR. "A pagar" do resumo é a
 *    soma de `max(0, final - pago)` de cada despesa, nunca
 *    `soma(finais) - soma(pagos)`: somar primeiro faz uma despesa paga a mais
 *    compensar outra em aberto, e as duas anomalias somem justo do número que
 *    deveria denunciá-las.
 *
 * 2. DENOMINADOR VAZIO NÃO PRODUZ INDICADOR. Percentual sobre zero devolve
 *    `null`, nunca 0 — é o `null` que faz a tela omitir a linha em vez de
 *    exibir "0% contratado" para quem nunca planejou nada.
 *
 * 3. "HOJE" É ENTRADA, NUNCA `new Date()` LÁ DENTRO. Além de tornar o cálculo
 *    testável, é o que permite resolver o dia no fuso de quem casa: o servidor
 *    roda em UTC, e às 22h de um sábado em São Paulo o UTC já é domingo — uma
 *    parcela venceria um dia antes da conta do casal.
 *
 * Todo valor é em centavos (inteiro), como em `presentes`.
 */

/** Janela do "vence em breve". Valor de negócio, nunca literal solto. */
export const DIAS_HORIZONTE_VENCIMENTO = 30

/** O fuso do evento. Datas do módulo são "ingênuas" (date puro), e o dia é o do casal. */
export const FUSO_DO_EVENTO = 'America/Sao_Paulo'

export type SituacaoParcela = 'paga' | 'a_vencer' | 'vencida'

/**
 * O que a tela de Pagamentos mostra por linha. `a_definir` é o compromisso
 * contratado cujo saldo ainda não tem data — ele existe em Pagamentos desde a
 * contratação, e não a partir do dia em que alguém lembrar de parcelar.
 */
export type SituacaoPagamento = SituacaoParcela | 'a_definir'

export type SituacaoFinanceiraFornecedor = 'sem_despesa' | 'a_pagar' | 'quitado'

/** Onde o gasto está entre planejar e pagar — o que a tela de Orçamento mostra por linha. */
export type EstagioDoGasto = 'planejado' | 'contratado' | 'quitado'

/** Linha de `parcelas_despesa`, no shape em que ela sai do banco. */
export interface ParcelaCalculavel {
  vence_em: string
  valor_centavos: number
  pago_em: string | null
}

/** Linha de `despesas` com suas parcelas. `valor_centavos` nulo = ainda não contratado. */
export interface DespesaCalculavel {
  valor_estimado_centavos: number | null
  valor_centavos: number | null
  parcelas: ParcelaCalculavel[]
}

/** Uma categoria e os gastos dela. `categoriaId` nulo é o grupo "Sem categoria". */
export interface GrupoDeCategoria {
  categoriaId: string | null
  nome: string
  valorPrevistoCentavos: number
  despesas: DespesaCalculavel[]
}

export interface TotaisDaDespesa {
  /** Custo estimado; cai para o final quando o gasto nasceu já contratado. */
  estimado: number
  /** Custo final, ou `null` enquanto o gasto é só planejamento. */
  contratado: number | null
  /** Soma das parcelas com `pago_em`. */
  pago: number
  /** Soma das parcelas sem `pago_em` — o que já tem vencimento marcado. */
  agendado: number
  /** Saldo do compromisso: `max(0, final - pago)`. Zero enquanto não há final. */
  aPagar: number
  /** Parte do saldo ainda sem vencimento definido. `aPagar = agendado + naoParcelado`. */
  naoParcelado: number
  /** Quanto as parcelas passam do valor final (aviso, nunca bloqueio). */
  parcelasAlemDoValor: number
  /** Quanto o pago passa do valor final (aviso, nunca bloqueio). */
  pagoAlemDoValor: number
  /** Diferença entre o que se fechou e o que se imaginava — negativo é economia. */
  desvioDoEstimado: number | null
  estagio: EstagioDoGasto
}

export interface LinhaDeCategoria {
  categoriaId: string | null
  nome: string
  /** Teto da categoria (`valor_previsto_centavos`). */
  orcado: number
  /** Soma dos custos estimados dos gastos dela. */
  estimado: number
  /** Soma dos custos finais — só o que já foi contratado. */
  contratado: number
  pago: number
  aPagar: number
  /** `max(0, orçado - estimado)`: quanto do teto ainda não tem destino. */
  aPlanejar: number
  /** `max(0, estimado - orçado)`: o planejamento já passou do teto. */
  acimaDoOrcado: number
  /** `max(0, estimado - contratado)`: o que falta fechar do que foi planejado. */
  aContratar: number
  percentualContratado: number | null
  /** Quantos gastos ainda não têm custo final. */
  gastosPlanejados: number
}

export interface BlocoDeAtencao {
  valor: number
  quantidade: number
}

export interface ResumoDoOrcamento {
  teto: number | null
  orcado: number
  estimado: number
  contratado: number
  pago: number
  aPagar: number
  agendado: number
  naoParcelado: number
  aPlanejar: number
  aContratar: number
  percentualContratado: number | null
  percentualPago: number | null
  /** `teto - orçado` quando há teto; pode ser negativo (distribuiu mais do que tem). */
  naoDistribuido: number | null
  atencao: {
    vencidos: BlocoDeAtencao
    proximos30Dias: BlocoDeAtencao
    acimaDoOrcado: BlocoDeAtencao
  }
  porCategoria: LinhaDeCategoria[]
}

/** Data de hoje (`YYYY-MM-DD`) no fuso do evento — o dia do casal, não o do servidor. */
export function hojeNoFusoDoEvento(agora: Date = new Date(), fuso = FUSO_DO_EVENTO): string {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente o formato de uma coluna
  // `date` do Postgres — sem montagem manual de string nem risco de mês 1-based.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora)
}

/**
 * Soma dias a uma data `YYYY-MM-DD`, devolvendo outra `YYYY-MM-DD`.
 *
 * Aritmética em UTC de propósito: a data aqui não tem hora, e usar o fuso local
 * faria o resultado mudar de dia perto da meia-noite em fuso negativo.
 */
export function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const base = Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1)
  return new Date(base + dias * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Situação de uma parcela. Parcela que vence HOJE é `a_vencer`, não `vencida`:
 * o casal ainda tem o dia todo para pagar, e chamar de vencida transformaria o
 * bloco de atenção num alarme falso diário.
 */
export function situacaoDaParcela(parcela: ParcelaCalculavel, hoje: string): SituacaoParcela {
  if (parcela.pago_em) return 'paga'
  return parcela.vence_em < hoje ? 'vencida' : 'a_vencer'
}

/** Percentual inteiro de 0 a N, ou `null` quando não há base para calcular (regra 2). */
export function percentual(parte: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((parte / total) * 100)
}

export function totaisDaDespesa(despesa: DespesaCalculavel): TotaisDaDespesa {
  let pago = 0
  let agendado = 0
  for (const parcela of despesa.parcelas) {
    if (parcela.pago_em) pago += parcela.valor_centavos
    else agendado += parcela.valor_centavos
  }

  const contratado = despesa.valor_centavos
  // Sem estimado, o próprio valor fechado serve de estimativa: é o caso de quem
  // contrata direto, sem passar pelo planejamento — e o total estimado da
  // categoria continuaria certo.
  const estimado = despesa.valor_estimado_centavos ?? contratado ?? 0
  const aPagar = contratado === null ? 0 : Math.max(0, contratado - pago)

  const estagio: EstagioDoGasto =
    contratado === null ? 'planejado' : aPagar === 0 && pago > 0 ? 'quitado' : 'contratado'

  return {
    estimado,
    contratado,
    pago,
    agendado,
    aPagar,
    // O piso mantém a identidade `aPagar = agendado + naoParcelado` de pé
    // mesmo quando as parcelas passam do valor da despesa.
    naoParcelado: Math.max(0, aPagar - agendado),
    parcelasAlemDoValor: contratado === null ? 0 : Math.max(0, pago + agendado - contratado),
    pagoAlemDoValor: contratado === null ? 0 : Math.max(0, pago - contratado),
    desvioDoEstimado:
      contratado === null || despesa.valor_estimado_centavos === null
        ? null
        : contratado - despesa.valor_estimado_centavos,
    estagio,
  }
}

export function linhaDeCategoria(grupo: GrupoDeCategoria): LinhaDeCategoria {
  let estimado = 0
  let contratado = 0
  let pago = 0
  let aPagar = 0
  let gastosPlanejados = 0

  for (const despesa of grupo.despesas) {
    const totais = totaisDaDespesa(despesa)
    estimado += totais.estimado
    contratado += totais.contratado ?? 0
    pago += totais.pago
    aPagar += totais.aPagar
    if (totais.contratado === null) gastosPlanejados += 1
  }

  const orcado = grupo.valorPrevistoCentavos

  return {
    categoriaId: grupo.categoriaId,
    nome: grupo.nome,
    orcado,
    estimado,
    contratado,
    pago,
    aPagar,
    aPlanejar: Math.max(0, orcado - estimado),
    // Sem teto não existe estouro: categoria sem orçado não está acima de nada,
    // está fora do planejamento (regra 2).
    acimaDoOrcado: orcado > 0 ? Math.max(0, estimado - orcado) : 0,
    aContratar: Math.max(0, estimado - contratado),
    percentualContratado: percentual(contratado, estimado),
    gastosPlanejados,
  }
}

/**
 * O resumo do topo do Orçamento: os estágios, as distâncias entre eles e o
 * bloco de atenção (docs/fase1-financeiro.md, seções 1.1 e 7).
 */
export function resumoDoOrcamento(
  grupos: GrupoDeCategoria[],
  opcoes: { hoje: string; tetoCentavos: number | null },
): ResumoDoOrcamento {
  const porCategoria = grupos.map(linhaDeCategoria)

  let orcado = 0
  let estimado = 0
  let contratado = 0
  let pago = 0
  let aPagar = 0
  let agendado = 0
  let naoParcelado = 0
  let aPlanejar = 0
  let aContratar = 0
  let acimaDoOrcadoValor = 0
  let acimaDoOrcadoQuantidade = 0

  for (const linha of porCategoria) {
    orcado += linha.orcado
    estimado += linha.estimado
    contratado += linha.contratado
    pago += linha.pago
    aPagar += linha.aPagar
    // Somar os pisos por categoria, nunca subtrair os totais: categoria
    // estourada não reduz o trabalho de planejar a que nem começou.
    aPlanejar += linha.aPlanejar
    aContratar += linha.aContratar
    if (linha.acimaDoOrcado > 0) {
      acimaDoOrcadoValor += linha.acimaDoOrcado
      acimaDoOrcadoQuantidade += 1
    }
  }

  for (const grupo of grupos) {
    for (const despesa of grupo.despesas) {
      const totais = totaisDaDespesa(despesa)
      agendado += totais.agendado
      naoParcelado += totais.naoParcelado
    }
  }

  const limiteDoHorizonte = somarDias(opcoes.hoje, DIAS_HORIZONTE_VENCIMENTO)
  const vencidos: BlocoDeAtencao = { valor: 0, quantidade: 0 }
  const proximos30Dias: BlocoDeAtencao = { valor: 0, quantidade: 0 }

  for (const grupo of grupos) {
    for (const despesa of grupo.despesas) {
      for (const parcela of despesa.parcelas) {
        const situacao = situacaoDaParcela(parcela, opcoes.hoje)
        if (situacao === 'vencida') {
          vencidos.valor += parcela.valor_centavos
          vencidos.quantidade += 1
        } else if (situacao === 'a_vencer' && parcela.vence_em <= limiteDoHorizonte) {
          proximos30Dias.valor += parcela.valor_centavos
          proximos30Dias.quantidade += 1
        }
      }
    }
  }

  return {
    teto: opcoes.tetoCentavos,
    orcado,
    estimado,
    contratado,
    pago,
    aPagar,
    agendado,
    naoParcelado,
    aPlanejar,
    aContratar,
    percentualContratado: percentual(contratado, estimado),
    percentualPago: percentual(pago, contratado),
    naoDistribuido: opcoes.tetoCentavos === null ? null : opcoes.tetoCentavos - orcado,
    atencao: {
      vencidos,
      proximos30Dias,
      acimaDoOrcado: {
        valor: acimaDoOrcadoValor,
        quantidade: acimaDoOrcadoQuantidade,
      },
    },
    porCategoria,
  }
}

/**
 * Situação financeira de um fornecedor — DERIVADA das despesas ligadas a ele,
 * nunca um estágio gravado. "Pago" não é etapa de negociação: o fornecedor
 * contratado cujas parcelas acabaram está quitado sem ninguém marcar nada.
 */
export function situacaoFinanceiraFornecedor(
  despesas: DespesaCalculavel[],
): SituacaoFinanceiraFornecedor {
  if (despesas.length === 0) return 'sem_despesa'
  const aPagar = despesas.reduce((total, despesa) => total + totaisDaDespesa(despesa).aPagar, 0)
  return aPagar > 0 ? 'a_pagar' : 'quitado'
}

/**
 * Gera parcelas mensais a partir de uma data, dividindo o valor em N.
 *
 * A sobra dos centavos vai toda na PRIMEIRA parcela, não na última: é a que o
 * casal costuma pagar como entrada, e receber o centavo a mais lá evita a
 * última parcela quebrada que ninguém consegue conciliar com o contrato.
 */
export function gerarParcelas(
  valorCentavos: number,
  quantidade: number,
  primeiroVencimento: string,
): Array<{ numero: number; vence_em: string; valor_centavos: number }> {
  if (quantidade < 1) return []

  const base = Math.floor(valorCentavos / quantidade)
  const sobra = valorCentavos - base * quantidade
  const [ano, mes, dia] = primeiroVencimento.split('-').map(Number)

  return Array.from({ length: quantidade }, (_, indice) => {
    // Somar meses, não 30 dias: parcela de casamento vence "todo dia 10".
    // Dia 31 em mês curto cai no último dia do mês, nunca vaza para o mês
    // seguinte (Date.UTC normalizaria 31/02 para 03/03).
    const mesAlvo = (mes ?? 1) - 1 + indice
    const ultimoDiaDoMes = new Date(Date.UTC(ano ?? 0, mesAlvo + 1, 0)).getUTCDate()
    const vencimento = new Date(Date.UTC(ano ?? 0, mesAlvo, Math.min(dia ?? 1, ultimoDiaDoMes)))

    return {
      numero: indice + 1,
      vence_em: vencimento.toISOString().slice(0, 10),
      valor_centavos: indice === 0 ? base + sobra : base,
    }
  })
}

/** Um gasto visto pela tela de Fornecedores: o que se planejou, o que se cotou. */
export interface GastoEmCotacao {
  estimado: number
  /** Valor fechado, ou `null` enquanto o gasto não virou compromisso. */
  contratado: number | null
  /** Propostas recebidas para ESTE gasto, em centavos. */
  cotacoes: readonly number[]
}

/**
 * O resumo do topo de Fornecedores.
 *
 * "Em cotação" é a soma da MENOR proposta de cada gasto ainda não fechado — o
 * melhor cenário se o casal fechasse hoje com quem já respondeu. Somar todas as
 * propostas daria um número que não significa nada: três fornecedores do mesmo
 * refrigerante não são três compras.
 *
 * "Sem fornecedor" conta o que ainda não tem nem uma proposta, e só entre os
 * gastos em aberto: gasto já contratado direto no Orçamento não está esperando
 * ninguém.
 */
export interface ResumoDeCotacoes {
  estimado: number
  emCotacao: number
  contratado: number
  gastosEmCotacao: number
  gastosSemFornecedor: number
}

export function resumoDeCotacoes(gastos: readonly GastoEmCotacao[]): ResumoDeCotacoes {
  let estimado = 0
  let emCotacao = 0
  let contratado = 0
  let gastosEmCotacao = 0
  let gastosSemFornecedor = 0

  for (const gasto of gastos) {
    estimado += gasto.estimado

    if (gasto.contratado !== null) {
      contratado += gasto.contratado
      continue
    }

    const propostas = gasto.cotacoes.filter((valor) => valor > 0)
    if (propostas.length === 0) {
      gastosSemFornecedor += 1
      continue
    }

    emCotacao += Math.min(...propostas)
    gastosEmCotacao += 1
  }

  return { estimado, emCotacao, contratado, gastosEmCotacao, gastosSemFornecedor }
}
