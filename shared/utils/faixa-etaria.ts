/**
 * Classificação etária do convidado — núcleo de domínio da regra.
 *
 * Princípio: **a data de nascimento pertence ao convidado; a regra de
 * classificação pertence ao evento**. Nada aqui grava "João é criança": a
 * idade é sempre calculada na DATA DO EVENTO e comparada com as faixas de
 * `casamentos.config_faixas_etarias`. Mudar a configuração reclassifica todo
 * mundo sem tocar em uma única linha de `convidados` — e a mesma pessoa pode
 * ser criança num evento e adolescente em outro.
 *
 * Compartilhado client/server de propósito: o formulário mostra a
 * classificação antes de salvar, a listagem exibe, o dashboard conta e
 * `/api/guests` filtra. Quatro implementações divergiriam no primeiro
 * aniversário de borda.
 */

/**
 * Catálogo da classificação etária **principal** do evento. Só os limites são
 * configuráveis; o conjunto de faixas é vocabulário da plataforma (espelha o
 * CHECK de `convidados.faixa_etaria_manual`). Classificações para outras
 * finalidades (alimentação, mesas, recreação) são trabalho futuro — por isso a
 * configuração é gravada sob a chave `principal`, e não como um array solto.
 */
export const FAIXA_ETARIA_CHAVES = ['crianca', 'adolescente', 'adulto', 'idoso'] as const

export type FaixaEtariaChave = (typeof FAIXA_ETARIA_CHAVES)[number]

export const FAIXA_ETARIA_ROTULOS: Record<FaixaEtariaChave, string> = {
  crianca: 'Criança',
  adolescente: 'Adolescente',
  adulto: 'Adulto',
  idoso: 'Idoso',
}

/** Plural, para contadores e chips de filtro ("8 Crianças"). */
export const FAIXA_ETARIA_ROTULOS_PLURAL: Record<FaixaEtariaChave, string> = {
  crianca: 'Crianças',
  adolescente: 'Adolescentes',
  adulto: 'Adultos',
  idoso: 'Idosos',
}

/** Valor de filtro/agrupamento de quem não tem nascimento nem faixa manual. */
export const FAIXA_ETARIA_NAO_INFORMADA = 'nao_informada'

export const FAIXA_ETARIA_ROTULO_NAO_INFORMADA = 'Não informada'

/** Chave de faixa ou "não informada" — o domínio de filtros, chips e contadores. */
export type FaixaEtariaFiltro = FaixaEtariaChave | typeof FAIXA_ETARIA_NAO_INFORMADA

/** Teto de sanidade dos limites configuráveis — guarda de entrada, não regra de negócio. */
export const IDADE_MAXIMA_SUPORTADA = 130

export interface FaixaEtaria {
  chave: FaixaEtariaChave
  idadeMinima: number
  /** `null` = faixa aberta no topo ("60 anos ou mais"). Só a última faixa. */
  idadeMaxima: number | null
}

/**
 * Ponto de partida de todo evento novo (o casal edita os limites em
 * Configurações). Nunca usar estes números como regra: quem classifica é
 * sempre a configuração do evento, resolvida por `resolverFaixasEtarias`.
 */
export const FAIXAS_ETARIAS_PADRAO: readonly FaixaEtaria[] = [
  { chave: 'crianca', idadeMinima: 0, idadeMaxima: 11 },
  { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 17 },
  { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
  { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
]

export function isFaixaEtariaChave(value: unknown): value is FaixaEtariaChave {
  return typeof value === 'string' && (FAIXA_ETARIA_CHAVES as readonly string[]).includes(value)
}

export function isFaixaEtariaFiltro(value: unknown): value is FaixaEtariaFiltro {
  return isFaixaEtariaChave(value) || value === FAIXA_ETARIA_NAO_INFORMADA
}

export function rotuloFaixaEtaria(chave: FaixaEtariaChave | null, plural = false): string {
  if (!chave) return FAIXA_ETARIA_ROTULO_NAO_INFORMADA
  return plural ? FAIXA_ETARIA_ROTULOS_PLURAL[chave] : FAIXA_ETARIA_ROTULOS[chave]
}

/**
 * Lê `casamentos.config_faixas_etarias` (tipado como `Json` pelo Supabase) e
 * devolve as faixas do evento, caindo no padrão da plataforma quando a coluna
 * está vazia ou com formato inesperado. Todo consumidor passa por aqui — é o
 * que dispensa cada tela de conhecer o shape do jsonb.
 */
export function resolverFaixasEtarias(config: unknown): FaixaEtaria[] {
  const principal = (config as { principal?: unknown } | null | undefined)?.principal
  if (!Array.isArray(principal) || principal.length === 0) return [...FAIXAS_ETARIAS_PADRAO]

  const faixas: FaixaEtaria[] = []
  for (const item of principal) {
    const faixa = item as Partial<FaixaEtaria> | null
    if (!faixa || !isFaixaEtariaChave(faixa.chave)) return [...FAIXAS_ETARIAS_PADRAO]
    if (typeof faixa.idadeMinima !== 'number') return [...FAIXAS_ETARIAS_PADRAO]
    // Ausente e null querem dizer a mesma coisa aqui: faixa aberta no topo.
    const temMaximo = faixa.idadeMaxima !== null && faixa.idadeMaxima !== undefined
    if (temMaximo && typeof faixa.idadeMaxima !== 'number') {
      return [...FAIXAS_ETARIAS_PADRAO]
    }
    faixas.push({
      chave: faixa.chave,
      idadeMinima: faixa.idadeMinima,
      idadeMaxima: faixa.idadeMaxima ?? null,
    })
  }
  return faixas
}

interface PartesData {
  ano: number
  mes: number
  dia: number
}

/** "yyyy-mm-dd" (ou o começo de um ISO) sem passar por `new Date`, que leria a string como UTC. */
function partesData(valor: string | null | undefined): PartesData | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((valor ?? '').trim())
  if (!match) return null
  const ano = Number(match[1])
  const mes = Number(match[2])
  const dia = Number(match[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return { ano, mes, dia }
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/**
 * Idade completa de quem nasceu em `dataNascimento` na data `dataReferencia`
 * (a data do evento — nunca "hoje", nunca a data de cadastro).
 *
 * Compara mês e dia, não só o ano: nascido em 15/05/2009 tem 18 anos num
 * evento de 16/05/2027, e nascido em 17/05/2009 tem 17 — mesmo ano de
 * nascimento, resultados diferentes. Aniversário no dia do evento conta como
 * já feito.
 */
export function calcularIdadeNaData(
  dataNascimento: string | null | undefined,
  dataReferencia: string | null | undefined,
): number | null {
  const nascimento = partesData(dataNascimento)
  const referencia = partesData(dataReferencia)
  if (!nascimento || !referencia) return null

  let idade = referencia.ano - nascimento.ano
  const jaFezAniversario =
    referencia.mes > nascimento.mes ||
    (referencia.mes === nascimento.mes && referencia.dia >= nascimento.dia)
  if (!jaFezAniversario) idade -= 1

  return idade < 0 ? null : idade
}

/**
 * `dataIso` menos `anos` anos, grudando no último dia do mês quando o dia não
 * existe no ano de destino (29/02 → 28/02). Sem isso, 29/02 viraria 01/03 e o
 * limite da faixa erraria em um dia para quem nasceu nessa virada.
 */
function subtrairAnos(dataIso: string, anos: number): string {
  const partes = partesData(dataIso)
  if (!partes) return dataIso
  const ano = partes.ano - anos
  const dia = Math.min(partes.dia, ultimoDiaDoMes(ano, partes.mes))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(ano).padStart(4, '0')}-${pad(partes.mes)}-${pad(dia)}`
}

export interface LimitesNascimentoFaixa {
  /** Nascido DEPOIS desta data (exclusivo). `null` na faixa aberta no topo. */
  nascidoDepoisDe: string | null
  /** Nascido ATÉ esta data (inclusive). */
  nascidoAte: string
}

/**
 * Converte uma faixa de idade em intervalo de datas de nascimento, para
 * filtrar no banco em vez de classificar no client.
 *
 * A listagem de convidados é paginada e o "N confirmados" do cabeçalho é
 * contado no banco: filtrar por faixa em memória descreveria uma lista
 * diferente da que está na tela (ver `server/api/guests/index.get.ts`). Como
 * `idade(D, nascimento) >= min` equivale a `nascimento <= D - min anos`, o
 * recorte é aritmética de datas exata — nenhuma função SQL nova, nenhuma
 * coluna derivada.
 */
export function limitesNascimentoFaixaEtaria(
  faixa: FaixaEtaria,
  dataEvento: string,
): LimitesNascimentoFaixa {
  return {
    nascidoDepoisDe:
      faixa.idadeMaxima === null ? null : subtrairAnos(dataEvento, faixa.idadeMaxima + 1),
    nascidoAte: subtrairAnos(dataEvento, faixa.idadeMinima),
  }
}

export interface ConvidadoClassificavel {
  data_nascimento: string | null
  faixa_etaria_manual: string | null
}

export interface ClassificacaoFaixaEtaria {
  chave: FaixaEtariaChave | null
  /**
   * De onde saiu a classificação — a interface precisa dizer ao casal se o
   * valor foi calculado ou informado à mão. `nao_informada` quando não há
   * nenhuma das duas informações, ou quando a idade não cai em faixa alguma.
   */
  origem: 'calculada' | 'manual' | 'nao_informada'
  /** Idade na data do evento, quando há data de nascimento. Nunca persistida. */
  idadeNoEvento: number | null
}

/**
 * Regra de prioridade (a ordem importa): data de nascimento válida vence
 * sempre — a faixa manual existe só para quem não tem nascimento cadastrado,
 * e nunca compete com uma data real.
 */
export function classificarFaixaEtaria(
  convidado: ConvidadoClassificavel,
  faixas: readonly FaixaEtaria[],
  dataEvento: string | null | undefined,
): ClassificacaoFaixaEtaria {
  const idadeNoEvento = calcularIdadeNaData(convidado.data_nascimento, dataEvento)

  if (idadeNoEvento !== null) {
    const faixa = faixas.find(
      (candidata) =>
        idadeNoEvento >= candidata.idadeMinima &&
        (candidata.idadeMaxima === null || idadeNoEvento <= candidata.idadeMaxima),
    )
    return faixa
      ? { chave: faixa.chave, origem: 'calculada', idadeNoEvento }
      : { chave: null, origem: 'nao_informada', idadeNoEvento }
  }

  if (isFaixaEtariaChave(convidado.faixa_etaria_manual)) {
    return { chave: convidado.faixa_etaria_manual, origem: 'manual', idadeNoEvento: null }
  }

  return { chave: null, origem: 'nao_informada', idadeNoEvento: null }
}

/** Descreve a faixa para a tela ("0 a 11 anos", "60 anos ou mais"). */
export function descreverLimitesFaixaEtaria(faixa: FaixaEtaria): string {
  if (faixa.idadeMaxima === null) return `${faixa.idadeMinima} anos ou mais`
  return `${faixa.idadeMinima} a ${faixa.idadeMaxima} anos`
}
