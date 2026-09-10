import { rotuloDeValor } from '#shared/utils/campos-convidado'
import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { InviteStage } from '~/types/invite'

/**
 * Fonte única de rótulo + cor de estado da plataforma.
 *
 * Existe porque o mesmo estado estava sendo pintado de três formas
 * diferentes: RSVP recusado era `danger` no modal de convite e `danger`
 * também para pendente no fluxo público; a resposta do convite era badge
 * `neutral/warning/success` no modal e texto `muted/primary/ink` na tabela;
 * "arquivado" era `neutral` em convites e `warning` na plataforma.
 *
 * A regra (decidida com o usuário em 2026-09-04):
 *
 * | tone     | significa                                          |
 * |----------|----------------------------------------------------|
 * | success  | desfecho positivo e resolvido                       |
 * | warning  | pendente COM ação esperada                          |
 * | danger   | falha real — erro operacional, algo a reparar       |
 * | neutral  | fato sem valência: encerrado, arquivado, não-ocorrido |
 * | primary  | identidade/papel — não é estado                     |
 *
 * "Pendente" só é `warning` quando existe providência a tomar. Quando
 * significa apenas "ainda não aconteceu", é `neutral` — ver
 * inviteStagePresentation, onde "Enviado" (a bola está com o convidado) é
 * neutral e "Aberto" (abriu e não respondeu) é warning.
 *
 * A apresentação é badge (UiBadge) em todo lugar — tabela e modal —, decisão
 * do usuário depois de ver as duas alternativas lado a lado: o preenchimento
 * suave separa o status do resto da linha melhor que o texto colorido. Se
 * algum dia uma tela precisar da variante em texto, ela deriva do `tone`
 * daqui, nunca de um mapa paralelo.
 */
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

export interface StatusPresentation {
  label: string
  tone: StatusTone
}

/**
 * Só o tom, que é decisão de tela. O **rótulo** vem do catálogo de campos
 * (`#shared/utils/campos-convidado`), porque a exportação de convidados
 * também precisa dele e roda no servidor, de onde `app/` não é importável —
 * duas listas dos mesmos cinco status divergiriam no primeiro ajuste de
 * texto.
 */
const RSVP_TONES: Record<RsvpStatus, StatusTone> = {
  // Responder é a ação que o produto inteiro existe para cobrar.
  pendente: 'warning',
  confirmado: 'success',
  // neutral, não danger: recusar é resposta válida e concluída, não falha do
  // sistema. Vermelho aqui sugeriria problema e concorreria com o vermelho de
  // erro/exclusão.
  recusado: 'neutral',
  lista_espera: 'neutral',
  removido: 'neutral',
}

export function rsvpStatusPresentation(status: RsvpStatus): StatusPresentation {
  return { label: rotuloDeValor('status_rsvp', status), tone: RSVP_TONES[status] }
}

/** Os cinco estágios do funil, na ordem do processo. */
export const INVITE_STAGE_VALUES: readonly InviteStage[] = [
  'not_sent',
  'sent',
  'opened',
  'partial',
  'responded',
]

interface StagePresentation extends StatusPresentation {
  /**
   * O que o casal faz a seguir. É o que justifica o funil existir: cada
   * estágio tem uma providência diferente, e era isso que a palavra
   * "Pendente" apagava ao cobrir quatro situações.
   *
   * "Enviar lembrete", nunca "cobrar": num produto de casamento o segundo
   * soa como dívida.
   */
  action: string | null
}

const STAGE_PRESENTATION: Record<InviteStage, StagePresentation> = {
  // Providência do casal pendente — âmbar é "pendente COM ação esperada".
  not_sent: { label: 'Não enviado', tone: 'warning', action: 'Enviar convite' },
  // Enviado e no prazo: a bola está com o convidado, nada a fazer ainda.
  sent: { label: 'Enviado', tone: 'neutral', action: null },
  // O único estágio comprovado pelo sistema, e o mais acionável de todos:
  // chegou, a pessoa olhou, e não respondeu.
  opened: { label: 'Aberto', tone: 'warning', action: 'Enviar lembrete' },
  partial: { label: 'Parcial', tone: 'warning', action: 'Lembrar os que faltam' },
  responded: { label: 'Respondido', tone: 'success', action: null },
}

/**
 * Estágio do convite. Sem o parâmetro `sent` que `inviteResponsePresentation`
 * exigia: ele existia para desambiguar "Pendente" — a mesma palavra em duas
 * situações, distinguidas só pelo tom. Agora as duas situações têm palavras
 * próprias ("Não enviado" e "Enviado"), então o tom não precisa carregar
 * significado que o texto não diz.
 */
export function inviteStagePresentation(stage: InviteStage): StagePresentation {
  return STAGE_PRESENTATION[stage]
}

/** Estado derivado de um presente na listagem administrativa. */
export const GIFT_STATUS_VALUES = ['disponivel', 'reservado', 'inativo'] as const

export type GiftStatus = (typeof GIFT_STATUS_VALUES)[number]

const GIFT_PRESENTATION: Record<GiftStatus, StatusPresentation> = {
  // Nenhum dos três pede providência: disponível é "ainda não aconteceu",
  // reservado é desfecho concluído e inativo é escolha do casal.
  disponivel: { label: 'Disponível', tone: 'neutral' },
  reservado: { label: 'Reservado', tone: 'success' },
  inativo: { label: 'Inativo', tone: 'neutral' },
}

export function giftStatusPresentation(status: GiftStatus): StatusPresentation {
  return GIFT_PRESENTATION[status]
}

/** Espelha casamentos.status_ciclo_vida. */
export const WEDDING_LIFECYCLE_VALUES = ['rascunho', 'publicado', 'arquivado'] as const

export type WeddingLifecycleStatus = (typeof WEDDING_LIFECYCLE_VALUES)[number]

const LIFECYCLE_PRESENTATION: Record<WeddingLifecycleStatus, StatusPresentation> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  publicado: { label: 'Publicado', tone: 'success' },
  // neutral (era warning): arquivar é decisão concluída, igual ao arquivado de
  // convites e grupos — não é alerta.
  arquivado: { label: 'Arquivado', tone: 'neutral' },
}

export function weddingLifecyclePresentation(status: WeddingLifecycleStatus): StatusPresentation {
  return LIFECYCLE_PRESENTATION[status]
}
