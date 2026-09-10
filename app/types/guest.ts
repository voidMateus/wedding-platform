import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { Database } from './database.types'
import type { InviteStage } from './invite'

export type Guest = Database['public']['Tables']['convidados']['Row']

/**
 * Linha da listagem do admin: o convidado mais o status de RSVP resolvido pela
 * view `convidados_com_status` (sem resposta = pendente).
 *
 * Não é o `Row` da view: lá o Postgres não infere NOT NULL de coluna nenhuma, e
 * o tipo sairia todo anulável — inclusive `id` e `nome_completo`, que vêm 1:1 de
 * `convidados` e nunca são nulos.
 */
export type GuestListItem = Guest & {
  status_rsvp: RsvpStatus
  /**
   * Estágio do funil do convite a que esta pessoa pertence, ou null quando ela
   * ainda não está em nenhum. Em inglês porque é campo computado de exibição —
   * não espelha coluna de tabela nenhuma, ao contrário de `status_rsvp`, que é
   * coluna da view (CLAUDE.md, seção 6).
   *
   * Existe para a coluna "Convite" da lista dizer o status do convite de fato,
   * em vez de só "Vinculado" — que era a informação menos útil possível: o
   * casal já sabe que a pessoa tem convite, o que ele precisa saber é se aquele
   * convite foi enviado, aberto ou respondido.
   */
  inviteStage: InviteStage | null
}
