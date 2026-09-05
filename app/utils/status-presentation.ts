import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { InviteResponseStatus } from '~/types/invite'

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
 * inviteResponsePresentation, onde isso depende do convite ter sido enviado.
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

const RSVP_PRESENTATION: Record<RsvpStatus, StatusPresentation> = {
  // Responder é a ação que o produto inteiro existe para cobrar.
  pendente: { label: 'Pendente', tone: 'warning' },
  confirmado: { label: 'Estará lá', tone: 'success' },
  // neutral, não danger: recusar é resposta válida e concluída, não falha do
  // sistema. Vermelho aqui sugeriria problema e concorreria com o vermelho de
  // erro/exclusão.
  recusado: { label: 'Não poderá ir', tone: 'neutral' },
  lista_espera: { label: 'Em espera', tone: 'neutral' },
  removido: { label: 'Removido', tone: 'neutral' },
}

export function rsvpStatusPresentation(status: RsvpStatus): StatusPresentation {
  return RSVP_PRESENTATION[status]
}

/** Os três estados consolidados de um convite, na ordem em que a tela oferece. */
export const INVITE_RESPONSE_STATUS_VALUES: readonly InviteResponseStatus[] = [
  'responded',
  'partial',
  'pending',
]

/**
 * Resposta consolidada de um convite. `sent` decide o tom de "pendente": sem
 * ter sido enviado, ninguém deve nada e o estado é só "ainda não aconteceu";
 * enviado e sem resposta, há providência (cobrar o convidado).
 */
export function inviteResponsePresentation(
  status: InviteResponseStatus,
  options: { sent: boolean },
): StatusPresentation {
  if (status === 'responded') return { label: 'Respondido', tone: 'success' }
  if (status === 'partial') return { label: 'Parcial', tone: 'warning' }
  return { label: 'Pendente', tone: options.sent ? 'warning' : 'neutral' }
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
