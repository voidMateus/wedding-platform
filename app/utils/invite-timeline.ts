import type { InviteEvent, InviteEventType, InviteMember } from '~/types/invite'

/** Como uma linha da Linha do Tempo do convite é apresentada ao casal. */
export interface InviteEventPresentation {
  label: string
  icon: string
  /** Só onde a cor carrega informação (aceitou/recusou); o resto fica neutro para a lista não virar semáforo. */
  tone: 'muted' | 'success' | 'danger'
}

/**
 * A frase que o casal lê em cada evento. `Record<InviteEventType, ...>` de
 * propósito: um tipo novo em `InviteEventType` não compila até alguém escrever
 * o texto dele aqui — foi um mapa incompleto (com chaves que nem existiam no
 * banco) que deixou `token.sent` aparecer cru na tela.
 */
export const INVITE_EVENT_PRESENTATION: Record<InviteEventType, InviteEventPresentation> = {
  'invite.created': { label: 'Convite criado', icon: 'lucide:file-plus', tone: 'muted' },
  'invite.archived': { label: 'Convite arquivado', icon: 'lucide:archive', tone: 'muted' },
  'invite.unarchived': {
    label: 'Convite desarquivado',
    icon: 'lucide:archive-restore',
    tone: 'muted',
  },
  'token.generated': { label: 'Link de acesso gerado', icon: 'lucide:key', tone: 'muted' },
  'token.sent': { label: 'Convite marcado como enviado', icon: 'lucide:send', tone: 'muted' },
  'rsvp.first_access': {
    label: 'Convite aberto pela primeira vez',
    icon: 'lucide:eye',
    tone: 'muted',
  },
  // Reescrito com nome e resposta reais em `describeInviteEvent`; este texto só
  // sobrevive se os metadados do evento vierem incompletos.
  'rsvp.guest_status_changed': {
    label: 'Resposta de RSVP atualizada',
    icon: 'lucide:refresh-cw',
    tone: 'muted',
  },
  'rsvp.message_sent': {
    label: 'Recado enviado pelo convidado',
    icon: 'lucide:message-circle',
    tone: 'muted',
  },
}

/** Complemento da frase de `rsvp.guest_status_changed`: "<Nome> confirmou presença". */
const RSVP_STATUS_PRESENTATION: Record<string, InviteEventPresentation> = {
  confirmado: { label: 'confirmou presença', icon: 'lucide:check-circle-2', tone: 'success' },
  recusado: { label: 'não poderá ir', icon: 'lucide:x-circle', tone: 'danger' },
  lista_espera: { label: 'entrou na lista de espera', icon: 'lucide:clock', tone: 'muted' },
  pendente: { label: 'voltou para pendente', icon: 'lucide:rotate-ccw', tone: 'muted' },
  removido: { label: 'foi removido do convite', icon: 'lucide:user-minus', tone: 'muted' },
}

// `tipo_evento` é texto livre no banco (log append-only, sem CHECK): um evento
// gravado por uma versão mais nova que esta tela ainda precisa aparecer, nem
// que seja sem frase própria — sumir com a linha esconderia história real.
const UNKNOWN_EVENT: InviteEventPresentation = {
  label: 'Evento registrado',
  icon: 'lucide:circle',
  tone: 'muted',
}

function readString(metadata: InviteEvent['metadados'], key: string): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

/**
 * Traduz um evento do log para a linha que o casal lê. `members` resolve o nome
 * de quem respondeu — os metadados do evento só guardam o id do convidado.
 */
export function describeInviteEvent(
  event: InviteEvent,
  members: readonly InviteMember[],
): InviteEventPresentation {
  const base = INVITE_EVENT_PRESENTATION[event.tipo_evento as InviteEventType] ?? UNKNOWN_EVENT

  if (event.tipo_evento !== 'rsvp.guest_status_changed') return base

  const status = readString(event.metadados, 'newStatus')
  const answer = status ? RSVP_STATUS_PRESENTATION[status] : undefined
  if (!answer) return base

  // O convidado pode ter saído do convite depois de responder — o evento
  // continua no log, então a frase precisa funcionar sem o nome.
  const guestId = readString(event.metadados, 'guestId')
  const name = members.find((member) => member.id === guestId)?.fullName

  return { ...answer, label: `${name ?? 'Um convidado'} ${answer.label}` }
}
