/**
 * Os estados possíveis de uma resposta de RSVP — espelha 1:1 o CHECK de
 * `respostas_rsvp.status_rsvp` (CLAUDE.md, seção 8: enum de domínio é union de
 * string literal, nunca `enum` do TypeScript).
 *
 * Vive em `shared/` porque agora os dois lados precisam: o client para rótulo e
 * cor (`rsvpStatusPresentation`) e o servidor para validar o filtro por status
 * da listagem de convidados.
 *
 * "pendente" é o único que também descreve a ausência de linha: quem nunca
 * respondeu não tem registro em `respostas_rsvp`, e é a view
 * `convidados_com_status` que resolve os dois casos no mesmo valor.
 */
export const RSVP_STATUS_VALUES = [
  'pendente',
  'confirmado',
  'recusado',
  'lista_espera',
  'removido',
] as const

export type RsvpStatus = (typeof RSVP_STATUS_VALUES)[number]

export function isRsvpStatus(value: unknown): value is RsvpStatus {
  return typeof value === 'string' && (RSVP_STATUS_VALUES as readonly string[]).includes(value)
}
