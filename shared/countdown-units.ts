// Catálogo das unidades da contagem regressiva — a fonte única de três coisas
// que precisam concordar entre si: QUAIS unidades o casal pode escolher, em
// que ORDEM elas aparecem na faixa, e como o tempo restante é REPARTIDO entre
// elas. A ordem do catálogo (da maior para a menor) é a própria cascata do
// cálculo: cada unidade consome o que sobrou da anterior.
//
// O catálogo em si não é editável — só a seleção, salva em
// `config_tema.countdownUnits`. Id desconhecido (salvo antes de sair do
// catálogo) é ignorado sem quebrar o Hero, como em shared/hero-buttons.ts.

/** Ids na ordem da faixa: da maior unidade para a menor. */
export type CountdownUnitId = 'meses' | 'semanas' | 'dias' | 'horas' | 'minutos' | 'segundos'

export interface CountdownUnitDefinition {
  id: CountdownUnitId
  /** Rótulo sob o número, no plural — o caso normal da faixa. */
  label: string
  /** O mesmo rótulo quando o valor é exatamente 1 ("1 dia", nunca "1 dias"). */
  labelSingular: string
  /** Como a unidade se apresenta na tela de Aparência. */
  adminLabel: string
  /**
   * Duração fixa em milissegundos. `null` no mês, que não tem uma: fevereiro
   * e março não duram o mesmo tanto, e dividir por "30 dias" faria a faixa
   * anunciar 8 meses num intervalo que o calendário chama de 7 — ver
   * separarMesesInteiros().
   */
  ms: number | null
  /**
   * Pode ficar de fora sem que a unidade seguinte fique ilegível?
   *
   * Só a semana pode. Ela é uma subdivisão do dia, e "2 meses e 12 dias" é
   * leitura corrente — o dia estourar os 7 não confunde ninguém. Pular
   * qualquer outra, não: sem os dias entre meses e horas, o rótulo HORAS
   * mostraria 38, e hora que passa de 24 contradiz o número ao lado.
   */
  skippable?: boolean
}

const SEGUNDO_MS = 1000
const MINUTO_MS = 60 * SEGUNDO_MS
const HORA_MS = 60 * MINUTO_MS
const DIA_MS = 24 * HORA_MS
const SEMANA_MS = 7 * DIA_MS

export const COUNTDOWN_UNIT_CATALOG: CountdownUnitDefinition[] = [
  { id: 'meses', label: 'meses', labelSingular: 'mês', adminLabel: 'Meses', ms: null },
  {
    id: 'semanas',
    label: 'semanas',
    labelSingular: 'semana',
    adminLabel: 'Semanas',
    ms: SEMANA_MS,
    skippable: true,
  },
  { id: 'dias', label: 'dias', labelSingular: 'dia', adminLabel: 'Dias', ms: DIA_MS },
  { id: 'horas', label: 'horas', labelSingular: 'hora', adminLabel: 'Horas', ms: HORA_MS },
  {
    id: 'minutos',
    label: 'minutos',
    labelSingular: 'minuto',
    adminLabel: 'Minutos',
    ms: MINUTO_MS,
  },
  {
    id: 'segundos',
    label: 'segundos',
    labelSingular: 'segundo',
    adminLabel: 'Segundos',
    ms: SEGUNDO_MS,
  },
]

export const COUNTDOWN_UNIT_IDS = COUNTDOWN_UNIT_CATALOG.map((unit) => unit.id)

/**
 * Seleção de quem nunca personalizou — as mesmas quatro unidades que a faixa
 * sempre teve. Casamento existente não muda de aparência por causa desta fase.
 */
export const DEFAULT_COUNTDOWN_UNITS: CountdownUnitId[] = ['dias', 'horas', 'minutos', 'segundos']

export function findCountdownUnit(id: string): CountdownUnitDefinition | undefined {
  return COUNTDOWN_UNIT_CATALOG.find((unit) => unit.id === id)
}

/**
 * Resolve a seleção salva para a faixa que será exibida.
 *
 * Entre a maior e a menor unidade marcadas, esta função reacende o que ficou
 * no meio — exceto as unidades `skippable`, que só entram se tiverem sido
 * escolhidas. Sem essa costura, "meses + horas" apagaria o dia que falta da
 * conta: a faixa mostraria "8 : 14" para 8 meses, 1 dia e 14 horas, um número
 * plausível e errado, ou um "38 HORAS" que contradiz o mês ao lado. Com ela,
 * cada unidade que não é a primeira fica dentro da própria régua, e a primeira
 * acumula tudo que está acima dela (só "dias" = 243 dias).
 *
 * Id fora do catálogo é descartado em silêncio; seleção vazia ou inteiramente
 * desconhecida cai no padrão — a contagem some por `showCountdown`, nunca por
 * ficar sem unidade nenhuma para mostrar.
 */
export function resolveCountdownUnits(selectedIds: string[] | undefined): CountdownUnitId[] {
  const escolhidas = new Set(selectedIds ?? [])
  const indices = (selectedIds ?? [])
    .map((id) => COUNTDOWN_UNIT_IDS.indexOf(id as CountdownUnitId))
    .filter((index) => index >= 0)

  if (!indices.length) return [...DEFAULT_COUNTDOWN_UNITS]

  return COUNTDOWN_UNIT_CATALOG.slice(Math.min(...indices), Math.max(...indices) + 1)
    .filter((unit) => !unit.skippable || escolhidas.has(unit.id))
    .map((unit) => unit.id)
}

export interface CountdownPart {
  id: CountdownUnitId
  /** Já concordando com o valor: "1 dia", "2 dias". */
  label: string
  value: number
}

/**
 * Soma meses ao calendário preservando o fim do mês.
 *
 * `setMonth` sozinho transborda (31 de janeiro + 1 mês = 3 de março), o que
 * faria a contagem pular um dia inteiro em datas de fim de mês. Aqui o dia é
 * fixado no último dia válido do mês de destino, que é a convenção que todo
 * mundo espera de "daqui a um mês".
 */
function somarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data.getTime())
  const diaOriginal = resultado.getDate()
  resultado.setDate(1)
  resultado.setMonth(resultado.getMonth() + meses)
  const ultimoDiaDoMes = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate()
  resultado.setDate(Math.min(diaOriginal, ultimoDiaDoMes))
  return resultado
}

/**
 * Quantos meses de calendário INTEIROS cabem entre as duas datas, e o que
 * sobra em milissegundos depois deles.
 *
 * A diferença de mês do calendário é só uma estimativa (31/03 → 01/04 são
 * "1 mês" por essa conta, e é um dia), então os dois laços corrigem a
 * estimativa para o maior número de meses que ainda cabe antes do alvo.
 */
function separarMesesInteiros(de: Date, alvo: Date): { meses: number; restoMs: number } {
  if (alvo.getTime() <= de.getTime()) return { meses: 0, restoMs: 0 }

  let meses = Math.max(
    0,
    (alvo.getFullYear() - de.getFullYear()) * 12 + (alvo.getMonth() - de.getMonth()),
  )

  while (meses > 0 && somarMeses(de, meses).getTime() > alvo.getTime()) meses -= 1
  while (somarMeses(de, meses + 1).getTime() <= alvo.getTime()) meses += 1

  return { meses, restoMs: alvo.getTime() - somarMeses(de, meses).getTime() }
}

/**
 * Reparte o tempo que falta entre as unidades escolhidas.
 *
 * A primeira unidade da faixa nunca é truncada (ela acumula tudo que está
 * acima), e a última descarta o resto — "8 : 1 : 14" não deve minutos a
 * ninguém. Meses precisam das datas, não só da diferença em milissegundos,
 * porque o calendário é que decide quanto dura cada um.
 */
export function computeCountdownParts(
  selectedIds: string[] | undefined,
  from: Date,
  target: Date,
): CountdownPart[] {
  const units = resolveCountdownUnits(selectedIds)

  let restoMs = Math.max(0, target.getTime() - from.getTime())
  let meses = 0

  if (units[0] === 'meses') {
    const separado = separarMesesInteiros(from, target)
    meses = separado.meses
    restoMs = separado.restoMs
  }

  return units.map((id) => {
    const unit = findCountdownUnit(id)!
    let value: number

    if (unit.ms === null) {
      value = meses
    } else {
      value = Math.floor(restoMs / unit.ms)
      restoMs -= value * unit.ms
    }

    return { id, value, label: value === 1 ? unit.labelSingular : unit.label }
  })
}
