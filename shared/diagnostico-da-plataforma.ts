/**
 * O que a equipe precisa OLHAR na lista de casamentos.
 *
 * A listagem interna respondia "quantos e de que tamanho"; não respondia "qual
 * deles está com problema". Numa lista de dez isso se vê no olho; em cem, não —
 * e o evento que precisa de um telefonema é justamente o que não faz barulho.
 *
 * Três regras valem para tudo que está aqui:
 *
 * 1. **Achado é DERIVADO, nunca uma coluna de estado.** Sai dos mesmos dados
 *    que a tabela já mostra, recalculado a cada leitura — como o estágio do
 *    convite e o vencimento de uma parcela. Nada aqui se "marca como
 *    resolvido": some quando o fato deixa de valer.
 *
 * 2. **Só se afirma o que os dados sustentam.** Nenhuma regra infere intenção
 *    ("o casal parece perdido") nem checa campo que não pode faltar — a data do
 *    evento é `not null` no banco, então "publicado sem data" é um achado que
 *    nunca existiria.
 *
 * 3. **Falso positivo custa mais que ausência.** Um painel que acusa problema
 *    em casamento saudável é desligado mentalmente na terceira vez, e aí deixa
 *    de servir para o caso real. Por isso toda regra de "parado" exige tempo
 *    decorrido, e nenhuma delas dispara no dia em que o evento é criado.
 *
 * "Hoje" é ENTRADA, nunca `new Date()` aqui dentro — mesma regra do
 * Planejamento e do Financeiro.
 */

/** Datas de evento são date-only (`2026-10-20`); as de registro, timestamp. */
type DataISO = string

export type StatusDeCasamento = 'rascunho' | 'publicado' | 'arquivado'

/** O que uma regra precisa saber sobre um casamento — nada além da listagem. */
export interface CasamentoObservado {
  id: string
  nomesNoivos: string
  statusCicloVida: StatusDeCasamento
  dataEvento: DataISO
  createdAt: string
  contagemConvidados: number
  temDono: boolean
  /** Última ação do CASAL. `null` = ele nunca mexeu neste painel. */
  ultimaAtividadeEm: string | null
}

/**
 * `alerta` é o que está quebrado ou prestes a custar o evento de alguém;
 * `atencao` é arrumação. Dois níveis, não cinco: com mais graus, ninguém
 * lembra a diferença entre o terceiro e o quarto, e a cor deixa de significar.
 */
export type SeveridadeDoAchado = 'alerta' | 'atencao'

export interface AchadoDaPlataforma {
  id: string
  severidade: SeveridadeDoAchado
  /** A frase da linha, já com o número ("3 casamentos sem convidados"). */
  titulo: string
  /** O que fazer a respeito — um achado sem saída é só má notícia. */
  acao: string
  icone: string
  /** Os casamentos afetados, na ordem em que entraram. */
  casamentos: CasamentoObservado[]
}

/** Sem atividade por este tanto, um casamento em andamento é um caso a olhar. */
export const DIAS_SEM_ATIVIDADE = 30

/** Daqui para dentro, um casamento parado deixa de ser espera e vira risco. */
export const DIAS_ATE_O_EVENTO_PARA_ALERTAR = 90

/** Depois disto, um evento que já aconteceu está ocupando a operação à toa. */
export const DIAS_APOS_O_EVENTO_PARA_ARQUIVAR = 30

/** Um rascunho recém-criado é o fluxo normal; um mês depois, é um cliente que não entrou. */
export const DIAS_DE_RASCUNHO_INTOCADO = 14

const MS_POR_DIA = 86_400_000

/** Dias inteiros entre dois instantes — negativo quando `alvo` já passou. */
function diasEntre(de: string, ate: string): number {
  return Math.floor((new Date(ate).getTime() - new Date(de).getTime()) / MS_POR_DIA)
}

/** Meia-noite local explícita: `new Date('2026-09-15')` seria lido como UTC. */
function meiaNoite(data: DataISO): string {
  return `${data.slice(0, 10)}T00:00:00`
}

function plural(quantos: number, singular: string, plural_: string): string {
  return quantos === 1 ? `${quantos} ${singular}` : `${quantos} ${plural_}`
}

interface Regra {
  id: string
  severidade: SeveridadeDoAchado
  icone: string
  acao: string
  titulo: (quantos: number) => string
  aplica: (casamento: CasamentoObservado, hoje: DataISO) => boolean
}

/**
 * O catálogo. Cada regra descreve um problema que a equipe resolve de um jeito
 * conhecido — e é por isso que `acao` é obrigatória: regra sem saída conhecida
 * não entra.
 *
 * Arquivado não entra em regra nenhuma: ele saiu da operação por decisão de
 * alguém, e monitorar o que ninguém opera é ruído garantido.
 */
const REGRAS: Regra[] = [
  {
    id: 'sem-dono',
    severidade: 'alerta',
    icone: 'lucide:user-x',
    acao: 'Ninguém consegue entrar neste painel. Vincule um dono na ficha.',
    titulo: (n) => plural(n, 'casamento sem dono', 'casamentos sem dono'),
    // O painel impede remover o último dono, mas a conta some por fora: excluir
    // o usuário no Auth deixa o casamento órfão sem passar por nenhuma tela.
    aplica: (c) => !c.temDono,
  },
  {
    id: 'parado-perto-do-evento',
    severidade: 'alerta',
    icone: 'lucide:clock-alert',
    acao: `Sem atividade do casal há ${DIAS_SEM_ATIVIDADE} dias com o evento chegando — vale um contato.`,
    titulo: (n) =>
      plural(n, 'casamento parado perto do evento', 'casamentos parados perto do evento'),
    aplica: (c, hoje) => {
      const faltam = diasEntre(meiaNoite(hoje), meiaNoite(c.dataEvento))
      if (faltam < 0 || faltam > DIAS_ATE_O_EVENTO_PARA_ALERTAR) return false
      // Nunca tocado conta como parado: é o pior caso, não uma exceção.
      if (!c.ultimaAtividadeEm) return true
      return diasEntre(c.ultimaAtividadeEm, meiaNoite(hoje)) >= DIAS_SEM_ATIVIDADE
    },
  },
  {
    id: 'publicado-sem-convidados',
    severidade: 'alerta',
    icone: 'lucide:user-round-search',
    acao: 'O site está no ar e não há para quem enviar convite.',
    titulo: (n) => plural(n, 'site publicado sem convidados', 'sites publicados sem convidados'),
    aplica: (c) => c.statusCicloVida === 'publicado' && c.contagemConvidados === 0,
  },
  {
    id: 'rascunho-intocado',
    severidade: 'atencao',
    icone: 'lucide:file-clock',
    acao: 'Criado faz tempo e o casal nunca entrou — o acesso pode não ter chegado a ele.',
    titulo: (n) => plural(n, 'casamento criado e nunca usado', 'casamentos criados e nunca usados'),
    aplica: (c, hoje) =>
      c.statusCicloVida === 'rascunho' &&
      c.ultimaAtividadeEm === null &&
      diasEntre(c.createdAt, meiaNoite(hoje)) >= DIAS_DE_RASCUNHO_INTOCADO,
  },
  {
    id: 'evento-passado-na-operacao',
    severidade: 'atencao',
    icone: 'lucide:archive',
    acao: 'O evento já aconteceu — arquivar tira da operação sem apagar nada.',
    titulo: (n) => plural(n, 'evento já realizado', 'eventos já realizados'),
    aplica: (c, hoje) =>
      diasEntre(meiaNoite(c.dataEvento), meiaNoite(hoje)) > DIAS_APOS_O_EVENTO_PARA_ARQUIVAR,
  },
]

/**
 * Passa a lista pelo catálogo.
 *
 * Um casamento pode aparecer em mais de um achado, de propósito: "sem dono" e
 * "parado perto do evento" são dois problemas diferentes no mesmo evento, e
 * esconder o segundo porque o primeiro já o citou faria a contagem do segundo
 * mentir.
 *
 * Ordem: alerta antes de atenção e, dentro de cada nível, o mais numeroso
 * primeiro — a ordem em que alguém agiria.
 */
export function diagnosticarPlataforma(
  casamentos: readonly CasamentoObservado[],
  hoje: DataISO,
): AchadoDaPlataforma[] {
  const emOperacao = casamentos.filter((c) => c.statusCicloVida !== 'arquivado')

  return REGRAS.map((regra) => ({
    id: regra.id,
    severidade: regra.severidade,
    icone: regra.icone,
    acao: regra.acao,
    casamentos: emOperacao.filter((casamento) => regra.aplica(casamento, hoje)),
  }))
    .filter((achado) => achado.casamentos.length > 0)
    .map((achado) => ({
      ...achado,
      titulo: REGRAS.find((r) => r.id === achado.id)!.titulo(achado.casamentos.length),
    }))
    .sort((a, b) => {
      if (a.severidade !== b.severidade) return a.severidade === 'alerta' ? -1 : 1
      return b.casamentos.length - a.casamentos.length
    })
}
