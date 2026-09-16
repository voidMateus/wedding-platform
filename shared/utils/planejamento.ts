import { somarDias } from './orcamento'
import { FASES_DO_PLANEJAMENTO, type FaseId, type TarefaSugerida } from '../planejamento-tarefas'

/**
 * O cálculo do Planejamento, num lugar só (docs/fase3-planejamento.md seção 5).
 *
 * Vive em `shared/` porque endpoint e tela precisam da MESMA conta: dois
 * lugares decidindo o que é "esta semana" divergem na borda que ninguém testa.
 *
 * Duas regras atravessam tudo aqui:
 *
 * 1. NADA DISTO É COLUNA. "Concluída" sai de `concluida_em`, "vencida" sai de
 *    `prazo` contra hoje, e a janela sai dos dois. Uma coluna de status mudaria
 *    de valor sozinha à meia-noite, sem nenhuma escrita para mantê-la em dia —
 *    a mesma lição de `pago_em` e de `status_convite`.
 *
 * 2. "HOJE" É ENTRADA, NUNCA `new Date()` LÁ DENTRO. Além de tornar o cálculo
 *    testável, é o que permite resolver o dia no fuso de quem casa
 *    (`hojeNoFusoDoEvento`): o servidor roda em UTC, e às 22h de um sábado em
 *    São Paulo já é domingo — uma tarefa apareceria vencida um dia antes da
 *    conta do casal.
 *
 * Comparação de datas é lexicográfica de propósito: `YYYY-MM-DD` ordena como
 * texto, então `prazo < hoje` é exatamente "venceu" sem nenhuma conversão para
 * `Date` no meio do caminho.
 */

/** Datas do domínio são date-only (`2026-10-20`), nunca timestamp. */
type DataISO = string

/** A janela "esta semana" é a semana à frente, não a semana do calendário. */
export const DIAS_ESTA_SEMANA = 7

/** E "este mês" são os trinta dias seguintes, pelo mesmo motivo. */
export const DIAS_ESTE_MES = 30

/**
 * As janelas, na ordem em que a tela as mostra — a ordem da urgência.
 *
 * `ja_passou` é só de sugestão, nunca de tarefa: é a fase do planejamento que
 * já ficou para trás para quem descobriu o produto tarde. Uma tarefa criada a
 * partir dela nasce SEM prazo (`prazoSugerido` devolve null), porque o sistema
 * não inventa atraso que o casal talvez não tenha.
 */
export const JANELAS = [
  'vencida',
  'esta_semana',
  'este_mes',
  'mais_adiante',
  'sem_prazo',
  'ja_passou',
  'concluida',
] as const

export type JanelaId = (typeof JANELAS)[number]

/**
 * Os rótulos nomeiam a JANELA MÓVEL, não o calendário.
 *
 * "Este mês" era o que estava escrito, e mentia por dois caminhos: em 15 de
 * setembro o grupo mostra tarefas de 5 de outubro (que estão dentro dos trinta
 * dias e fora do mês), e em 28 de setembro ele mostraria três dias de setembro
 * e vinte e sete de outubro. Quem lê "Este mês" confere a data, não bate, e
 * conclui que o agrupamento está quebrado — foi exatamente o que uma auditoria
 * externa concluiu.
 *
 * Os ids (`esta_semana`, `este_mes`) ficam como estão: eles nomeiam o conceito
 * no código, e trocá-los custaria churn em tela, painel e testes para não mudar
 * nada que o casal veja.
 *
 * `ja_passou` também deixou de afirmar o que não sabe. Ele guarda sugestões
 * cuja fase ficou para trás — não sugestões resolvidas: quem descobre o produto
 * a quatro meses do casamento talvez não tenha feito nada daquilo.
 */
export const ROTULOS_JANELA: Record<JanelaId, string> = {
  vencida: 'Vencidas',
  esta_semana: 'Próximos 7 dias',
  este_mes: 'Próximos 30 dias',
  mais_adiante: 'Mais adiante',
  sem_prazo: 'Sem prazo',
  ja_passou: 'De etapas que já passaram',
  concluida: 'Concluídas',
}

/** O mínimo de uma tarefa para o cálculo — a linha do banco satisfaz. */
export interface TarefaCalculavel {
  prazo: string | null
  concluida_em: string | null
}

/**
 * Em que janela a tarefa cai.
 *
 * Concluída vence qualquer prazo: uma tarefa feita com uma semana de atraso não
 * é "vencida", é feita — e continuar mostrando-a em vermelho transformaria a
 * checklist num registro de culpa.
 */
export function janelaDaTarefa(tarefa: TarefaCalculavel, hoje: DataISO): JanelaId {
  if (tarefa.concluida_em) return 'concluida'
  if (!tarefa.prazo) return 'sem_prazo'
  if (tarefa.prazo < hoje) return 'vencida'
  if (tarefa.prazo <= somarDias(hoje, DIAS_ESTA_SEMANA)) return 'esta_semana'
  if (tarefa.prazo <= somarDias(hoje, DIAS_ESTE_MES)) return 'este_mes'
  return 'mais_adiante'
}

/**
 * O prazo que uma sugestão propõe: a data do evento menos a antecedência da
 * fase.
 *
 * Devolve `null` quando essa data já passou — é a decisão 3 do refinamento. Um
 * casal que descobre o produto a quatro meses do casamento veria quinze linhas
 * vermelhas no primeiro segundo, e nenhuma delas seria um atraso que ele
 * realmente tem.
 */
export function prazoSugerido(
  fase: FaseId,
  dataEvento: DataISO | null,
  hoje: DataISO,
): DataISO | null {
  if (!dataEvento) return null
  const definicao = FASES_DO_PLANEJAMENTO.find((item) => item.id === fase)
  if (!definicao) return null

  const prazo = somarDias(dataEvento, -definicao.diasAntes)
  return prazo < hoje ? null : prazo
}

/**
 * Em que janela a SUGESTÃO aparece — o mesmo eixo das tarefas, de propósito.
 *
 * É o que evita duas taxonomias na mesma tela: a sugestão não se agrupa por
 * "fase do planejamento" enquanto as tarefas se agrupam por urgência; ela cai
 * na janela do próprio prazo sugerido, no rodapé do grupo a que pertenceria.
 */
export function janelaDaSugestao(
  sugestao: TarefaSugerida,
  dataEvento: DataISO | null,
  hoje: DataISO,
): JanelaId {
  const prazo = prazoSugerido(sugestao.fase, dataEvento, hoje)
  // Sem data de evento não há como propor prazo nenhum, e a fase não ajuda:
  // tudo é "algum dia". As sugestões ficam em "sem prazo", que é exatamente o
  // que elas são nesse caso.
  if (!dataEvento) return 'sem_prazo'
  if (!prazo) return 'ja_passou'
  return janelaDaTarefa({ prazo, concluida_em: null }, hoje)
}

export interface ResumoDoPlanejamento {
  total: number
  concluidas: number
  vencidas: number
  estaSemana: number
  /** `null` quando não há nenhuma tarefa — indicador sem base é omitido, nunca exibido como 0%. */
  percentualConcluido: number | null
}

export function resumoDoPlanejamento(
  tarefas: readonly TarefaCalculavel[],
  hoje: DataISO,
): ResumoDoPlanejamento {
  let concluidas = 0
  let vencidas = 0
  let estaSemana = 0

  for (const tarefa of tarefas) {
    const janela = janelaDaTarefa(tarefa, hoje)
    if (janela === 'concluida') concluidas += 1
    else if (janela === 'vencida') vencidas += 1
    else if (janela === 'esta_semana') estaSemana += 1
  }

  return {
    total: tarefas.length,
    concluidas,
    vencidas,
    estaSemana,
    percentualConcluido:
      tarefas.length === 0 ? null : Math.round((concluidas / tarefas.length) * 100),
  }
}

/**
 * O que o painel mostra do módulo: UM número, o que pede providência hoje.
 *
 * Vencidas primeiro; sem vencidas, as desta semana; sem nenhuma das duas, o
 * progresso. Nunca os três — é a mesma regra do alerta do Financeiro, e ela
 * existe porque um painel com quatro números de quatro módulos deixa de ser
 * painel.
 */
export type DestaqueDoPlanejamento =
  | { tipo: 'vencidas'; quantidade: number }
  | { tipo: 'esta_semana'; quantidade: number }
  | { tipo: 'progresso'; concluidas: number; total: number }
  | null

export function destaqueDoPlanejamento(resumo: ResumoDoPlanejamento): DestaqueDoPlanejamento {
  if (resumo.total === 0) return null
  if (resumo.vencidas > 0) return { tipo: 'vencidas', quantidade: resumo.vencidas }
  if (resumo.estaSemana > 0) return { tipo: 'esta_semana', quantidade: resumo.estaSemana }
  return { tipo: 'progresso', concluidas: resumo.concluidas, total: resumo.total }
}

/**
 * Quantos dias faltam para o casamento. Negativo depois que ele acontece.
 *
 * Mora aqui porque é a MESMA conta que define as janelas da checklist — "quanto
 * falta" é o assunto deste arquivo —, ainda que quem a exiba seja o cabeçalho do
 * painel inteiro. Aritmética em UTC pelo motivo de `somarDias`: as duas pontas
 * são datas sem hora, e o fuso local mudaria o resultado perto da meia-noite.
 */
export function diasAteOEvento(dataEvento: DataISO | null, hoje: DataISO): number | null {
  if (!dataEvento) return null
  const evento = Date.parse(`${dataEvento}T00:00:00Z`)
  const referencia = Date.parse(`${hoje}T00:00:00Z`)
  if (Number.isNaN(evento) || Number.isNaN(referencia)) return null
  return Math.round((evento - referencia) / 86_400_000)
}

/**
 * A contagem regressiva do cabeçalho, como texto.
 *
 * `null` quando não há nada a dizer, e isso inclui o casamento que **já
 * aconteceu**: contagem regressiva de evento passado não informa, cobra. Depois
 * da festa o cabeçalho volta a ser só a data — que continua sendo a identidade
 * do casamento enquanto o casal fecha pagamentos e escolhe as fotos do álbum.
 */
export function rotuloDaContagem(dias: number | null): string | null {
  if (dias === null || dias < 0) return null
  if (dias === 0) return 'é hoje'
  if (dias === 1) return 'falta 1 dia'
  return `faltam ${dias} dias`
}
