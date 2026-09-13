import type { CanalComunicacao, TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import type { Database } from './database.types'

export type Invite = Database['public']['Tables']['convites']['Row']
export type InviteTag = Database['public']['Tables']['etiquetas_convite']['Row']
export type InviteEvent = Database['public']['Tables']['historico_convite']['Row']

/**
 * O estágio operacional do convite: o mais avançado que ele alcançou.
 *
 * Substitui `InviteResponseStatus` ('pending' | 'partial' | 'responded'), que
 * respondia só "responderam?" — e por isso escrevia "Pendente" em quatro
 * situações com providências opostas (não enviado, enviado sem resposta,
 * aberto sem resposta, parte respondeu). Cada estágio aqui implica os
 * anteriores, então uma coluna basta e nada se perde.
 *
 * Nenhum estágio exige jornada digital: uma resposta registrada pelo casal
 * leva o convite direto a `partial`/`responded` sem passar por `opened`.
 *
 * Derivado em SQL (`convites_com_resumo.status_operacional`), nunca uma fonte
 * de verdade própria — os fatos são `enviado_em`, o evento `rsvp.first_access`
 * e as linhas de `respostas_rsvp`.
 */
export type InviteStage = 'not_sent' | 'sent' | 'opened' | 'partial' | 'responded'

/**
 * Valores de `historico_convite.tipo_evento` gravados hoje. A coluna é `text`
 * livre no Postgres (log append-only, sem CHECK), então esta união espelha os
 * pontos de escrita reais: `server/api/invites/index.post.ts`,
 * `.../[id]/archive.post.ts`, `.../[id]/send.post.ts`,
 * `server/api/guest-access-tokens/index.post.ts`,
 * `server/utils/rsvp-invite-payload.ts` e as funções `upsert_guest_rsvp()` /
 * `finalizar_rsvp_convite()`.
 *
 * Evento novo entra aqui primeiro: o mapa de rótulos da Linha do Tempo é um
 * `Record<InviteEventType, ...>`, então deixa de compilar até ganhar o texto
 * que o casal vai ler — foi assim que `token.sent` apareceu cru na tela.
 */
export type InviteEventType =
  | 'invite.created'
  | 'invite.archived'
  | 'invite.unarchived'
  | 'token.generated'
  // `token.sent`/`token.unsent` não são mais GRAVADOS: o envio deixou de ser um
  // timestamp marcado à mão e virou `comunicacao.enviada`, com tipo e canal. Os
  // dois continuam aqui porque o log é append-only — eventos gravados antes da
  // Fase 2 seguem no banco e precisam de frase própria, senão a Linha do Tempo
  // de um convite antigo passaria a exibir "Evento registrado" no lugar deles.
  | 'token.sent'
  | 'token.unsent'
  | 'comunicacao.enviada'
  | 'rsvp.first_access'
  | 'rsvp.guest_status_changed'
  | 'rsvp.message_sent'

export interface InviteListItem extends Invite {
  /**
   * Quando o convite saiu. DERIVADO (`convites_com_resumo`), do primeiro
   * registro de envio do tipo `convite` — não existe mais como coluna de
   * `convites`, e por isso precisa ser declarado aqui em vez de vir do `Row`.
   * Em snake_case porque espelha a coluna da view 1:1 (CLAUDE.md, seção 6).
   */
  enviado_em: string | null
  responsibleGuestName: string | null
  memberCount: number
  stage: InviteStage
  /** Quantos dos membros já responderam — o "3 de 5" ao lado do estágio. */
  respondedCount: number
  /**
   * Quando o convite entrou no estágio atual, ou null em `not_sent` (nada
   * aconteceu ainda). É o que transforma o estágio em providência: "Aberto"
   * informa, "Aberto há 14 dias" pede um lembrete.
   */
  stageSince: string | null
}

export interface InviteMember {
  id: string
  fullName: string
  nickname: string | null
  /**
   * Núcleo de Acompanhantes a que a pessoa pertence, ou null. Serve para
   * manter os que vêm juntos juntos na exibição do convite — substitui o
   * `partyOrder` que existia aqui e que ninguém lia: posição dentro de um
   * núcleo não tem significado nenhum na escala do convite, que pode conter
   * vários núcleos e gente sem núcleo.
   */
  partyId: string | null
  isResponsible: boolean
  rsvpStatus: 'pendente' | 'confirmado' | 'recusado' | 'lista_espera'
}

export interface InviteDetail extends Invite {
  stage: InviteStage
  memberCount: number
  respondedCount: number
  stageSince: string | null
  members: InviteMember[]
  tags: InviteTag[]
  /**
   * Os envios registrados deste convite, do mais recente para o mais antigo.
   *
   * É daqui que sai o estágio "Enviado" do funil (via `convites_com_resumo`),
   * e é aqui que "Marcar como enviado" virou "Registrar envio": o fato ganhou
   * uma linha própria, com tipo e canal, em vez de um timestamp marcado à mão.
   */
  envios: {
    id: string
    tipo: TipoComunicacao
    canal: CanalComunicacao
    enviadoEm: string
  }[]
}
