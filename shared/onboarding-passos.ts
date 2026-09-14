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
 ## O básico do básico, e nada além
 *
 * Quatro passos: quando, onde, a cara do site, e publicar — agora ou depois.
 * Saíram, em 2026-09-14, o prazo de RSVP, o teto do orçamento e montar a lista
 * de convidados: os três são trabalho de MÓDULO, e cobrá-los de quem acabou de
 * entrar é pedir decisão sobre fluxos que ainda não existem para o casal. O
 * módulo correspondente pede cada um deles na hora certa, no próprio estado
 * vazio.
 *
 * ## A ordem é esta, e é a única
 *
 * O roteiro desenha os quatro na ordem desta lista; o wizard é um FILTRO sobre
 * ela (`PASSOS_DO_WIZARD`), na mesma sequência. Não existe uma segunda lista
 * para divergir — é a lição de `home-sections.ts`, onde um catálogo paralelo
 * ficou com 8 entradas para 11 seções sem nada acusar a falta.
 *
 * Não há agrupamento: com quatro linhas, um cabeçalho sobre "Publicar o site"
 * sozinho ocuparia mais do que explica — a mesma razão que descartou a versão
 * de três grupos quando eram sete passos.
 *
 * Nada aqui vira linha no banco: o progresso é sempre derivado dos fatos
 * observados (`server/utils/fatos-do-casamento.ts`), nunca de uma coluna de
 * estado a manter sincronizada.
 */

export interface PassoDoOnboarding {
  /** Chave estável — usada na URL do wizard (`?passo=`) e nos testes. */
  id: string
  rotulo: string
  /** O fato que marca este passo como cumprido. */
  fato: FatoSimples
  /**
   * É uma etapa do wizard? Só passo que é CAMPO entra — publicar é ATO, e
   * decidir publicar agora ou depois não é preencher um formulário: vive no
   * roteiro e leva à Situação do site, em Configurações.
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
    fato: 'local_definido',
    noWizard: true,
    acao: 'definir',
    chamada: 'por onde vai ser',
  },
  {
    id: 'aparencia',
    rotulo: 'A cara do site',
    // Última etapa do wizard de propósito: é a única em que errar não custa
    // nada — e o casal troca o tema quantas vezes quiser depois.
    fato: 'identidade_visual_definida',
    noWizard: true,
    acao: 'escolher',
    chamada: 'pela cara do site',
  },
  {
    id: 'publicar',
    rotulo: 'Publicar o site',
    fato: 'site_publicado',
    noWizard: false,
    // "agora ou depois" e não "publicar": publicar é escolha, não pendência. O
    // casal que prefere deixar para quando o site estiver do jeito dele não
    // está atrasado em nada.
    acao: 'agora ou depois',
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
