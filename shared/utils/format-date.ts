// Formatação de data/data-hora em pt-BR — reaproveitado pelas listagens e
// telas de detalhe do admin, pra não ter a mesma expressão toLocaleString
// espalhada pelo código.

export function formatDateTimePtBR(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatDatePtBR(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}
