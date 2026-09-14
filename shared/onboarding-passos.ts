import type { FatoObservado, FatoSimples } from '#shared/fatos-do-casamento'

/**
 * O roteiro de Primeiros passos — o que falta o SISTEMA saber sobre este
 * casamento (docs/fase4-onboarding.md).
 *
 * ## Não confundir com o catálogo de tarefas
 *
 * `planejamento-tarefas.ts` responde "o que falta fazer no mundo" e nunca se
 * marca sozinho: concluir uma tarefa a partir de um dado exigiria INFERIR um
 * fato do mundo, e inferência errada apaga trabalho declarado.
 *
 * Aqui não há inferência nenhuma. "O local está cadastrado" não é indício de
 * outra coisa, É a coisa que o passo pede — o passo e o fato são o mesmo
 * objeto. Por isso o roteiro se marca sozinho, não tem botão de concluir, e
 * some quando acaba.
 *
 * ## A ordem é esta, e é a única
 *
 * O roteiro desenha os sete na ordem desta lista; o wizard é um FILTRO sobre
 * ela (`PASSOS_DO_WIZARD`), na mesma sequência. Não existe uma segunda lista
 * para divergir — é a lição de `home-sections.ts`, onde um catálogo paralelo
 * ficou com 8 entradas para 11 seções sem nada acusar a falta.
 *
 * Nada aqui vira linha no banco: o progresso é sempre derivado dos fatos
 * observados (`server/utils/fatos-do-casamento.ts`), nunca de uma coluna de
 * estado a manter sincronizada.
 */

/**
 * Os dois grupos do roteiro.
 *
 * A divisão é a mesma que decide quem entra no wizard: *Configurar* é campo
 * (uma pergunta, uma resposta), *Começar a usar* é trabalho e ato. O
 * agrupamento só torna visível uma distinção que o desenho já tinha — sem ele,
 * "Publicar o site" parece a sétima pergunta de um formulário.
 */
export const GRUPOS_DO_ROTEIRO = [
  { id: 'configurar', rotulo: 'Configurar' },
  { id: 'comecar', rotulo: 'Começar a usar' },
] as const

export type GrupoDoRoteiroId = (typeof GRUPOS_DO_ROTEIRO)[number]['id']

export interface PassoDoOnboarding {
  /** Chave estável — usada na URL do wizard (`?passo=`) e nos testes. */
  id: string
  rotulo: string
  grupo: GrupoDoRoteiroId
  /** O fato que marca este passo como cumprido. */
  fato: FatoSimples
  /**
   * É uma etapa do wizard? Só passo que é CAMPO entra: montar a lista é
   * trabalho (tem tela, importador e entrada rápida) e publicar é ato — os
   * dois vivem no roteiro e levam ao lugar certo.
   */
  noWizard: boolean
  /** Texto do link quando o passo ainda não está cumprido. */
  acao: string
  /**
   * Como o passo se chama DENTRO da frase do botão principal do acolhimento
   * ("Começar pelo horário do casamento").
   *
   * Existe porque o rótulo não sobrevive à frase: "Começar por Data e horário"
   * é a leitura de um formulário, não um convite. É prosa visível ao casal, e
   * por isso mora junto do resto das palavras do passo, nunca na tela.
   */
  chamada: string
  /** Rota relativa à base do casamento (`/admin/<slug>`), para os passos fora do wizard. */
  destino?: string
}

export const PASSOS_DO_ONBOARDING: readonly PassoDoOnboarding[] = [
  {
    id: 'data-horario',
    rotulo: 'Data e horário',
    grupo: 'configurar',
    // A DATA não é um passo: é obrigatória na criação do casamento, então um
    // passo que nasce cumprido para todo mundo só encheria a lista. O que
    // falta de verdade é o horário — que a contagem regressiva, o convite e o
    // cronograma usam.
    fato: 'horario_definido',
    noWizard: true,
    acao: 'definir',
    chamada: 'pelo horário do casamento',
  },
  {
    id: 'local',
    rotulo: 'Onde vai ser',
    grupo: 'configurar',
    fato: 'local_definido',
    noWizard: true,
    acao: 'definir',
    chamada: 'por onde vai ser',
  },
  {
    id: 'prazo-rsvp',
    rotulo: 'Prazo de RSVP',
    grupo: 'configurar',
    fato: 'prazo_rsvp_definido',
    noWizard: true,
    acao: 'definir',
    chamada: 'pelo prazo de RSVP',
  },
  {
    id: 'orcamento',
    rotulo: 'Teto do orçamento',
    grupo: 'configurar',
    fato: 'orcamento_definido',
    noWizard: true,
    acao: 'definir',
    chamada: 'pelo teto do orçamento',
  },
  {
    id: 'aparencia',
    rotulo: 'A cara do site',
    grupo: 'configurar',
    // Última etapa do wizard de propósito: é a única em que errar não custa
    // nada, e por isso a certa para terminar.
    fato: 'identidade_visual_definida',
    noWizard: true,
    acao: 'escolher',
    chamada: 'pela cara do site',
  },
  {
    id: 'convidados',
    rotulo: 'Lista de convidados',
    grupo: 'comecar',
    fato: 'tem_convidado',
    noWizard: false,
    acao: 'ir para a lista',
    chamada: 'pela lista de convidados',
    destino: '/convidados',
  },
  {
    id: 'publicar',
    rotulo: 'Publicar o site',
    grupo: 'comecar',
    fato: 'site_publicado',
    noWizard: false,
    acao: 'publicar',
    chamada: 'publicando o site',
    destino: '/configuracoes?secao=evento',
  },
]

/** As etapas do wizard, na mesma ordem do roteiro — é um filtro, nunca outra lista. */
export const PASSOS_DO_WIZARD = PASSOS_DO_ONBOARDING.filter((passo) => passo.noWizard)

export interface PassoResolvido extends PassoDoOnboarding {
  concluido: boolean
  /**
   * O passo foi deliberadamente pulado?
   *
   * Derivado, como todo o resto: se este passo está vazio e algum posterior
   * está cumprido, o casal necessariamente passou por ele e seguiu. Nenhuma
   * "etapa pulada" vai para o banco, e mesmo assim o wizard consegue dizer
   * "você pulou esta etapa antes" em vez de deixar a pessoa se perguntando por
   * que está vendo aquilo de novo.
   */
  pulado: boolean
}

export interface RoteiroDoOnboarding {
  passos: PassoResolvido[]
  concluidos: number
  total: number
  /** Todos cumpridos — o bloco do Início some. */
  completo: boolean
  /** A primeira etapa do wizard ainda em aberto; null quando não há nenhuma. */
  proximaEtapaDoWizard: PassoResolvido | null
  /**
   * O primeiro passo em aberto, seja ele etapa do wizard ou não.
   *
   * É o que o acolhimento nomeia no botão principal: com as cinco perguntas já
   * respondidas e a lista ainda vazia, "Começar" precisa apontar para a lista
   * — e não sumir por não haver mais etapa de wizard.
   */
  proximoPasso: PassoResolvido | null
}

export function resolverPassosDoOnboarding(fatos: readonly FatoObservado[]): RoteiroDoOnboarding {
  const observados = new Set<string>(fatos)

  const concluidoPorIndice = PASSOS_DO_ONBOARDING.map((passo) => observados.has(passo.fato))

  const passos: PassoResolvido[] = PASSOS_DO_ONBOARDING.map((passo, indice) => ({
    ...passo,
    concluido: concluidoPorIndice[indice] ?? false,
    pulado:
      !concluidoPorIndice[indice] &&
      concluidoPorIndice.slice(indice + 1).some((posterior) => posterior),
  }))

  const concluidos = passos.filter((passo) => passo.concluido).length

  return {
    passos,
    concluidos,
    total: passos.length,
    completo: concluidos === passos.length,
    proximaEtapaDoWizard: passos.find((passo) => passo.noWizard && !passo.concluido) ?? null,
    proximoPasso: passos.find((passo) => !passo.concluido) ?? null,
  }
}
