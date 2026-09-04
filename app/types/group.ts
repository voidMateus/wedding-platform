import type { Database } from './database.types'

export type Group = Database['public']['Tables']['grupos']['Row']

/**
 * Linha de `grupos` enriquecida com o andamento do grupo, montado por
 * /api/groups para exibição (CLAUDE.md, seção 6: DTO computado fica em
 * inglês, como InviteListItem). guestCount conta convidados não excluídos
 * com esse grupo_id; confirmedCount, quantos deles têm RSVP 'confirmado'.
 */
export interface GroupListItem extends Group {
  guestCount: number
  confirmedCount: number
}
