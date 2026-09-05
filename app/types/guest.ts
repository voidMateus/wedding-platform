import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { Database } from './database.types'

export type Guest = Database['public']['Tables']['convidados']['Row']

/**
 * Linha da listagem do admin: o convidado mais o status de RSVP resolvido pela
 * view `convidados_com_status` (sem resposta = pendente).
 *
 * Não é o `Row` da view: lá o Postgres não infere NOT NULL de coluna nenhuma, e
 * o tipo sairia todo anulável — inclusive `id` e `nome_completo`, que vêm 1:1 de
 * `convidados` e nunca são nulos.
 */
export type GuestListItem = Guest & { status_rsvp: RsvpStatus }
