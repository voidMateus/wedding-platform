// Formatação de centavos em Real (BRL) — reaproveitado por todo lugar que
// exibe preço/valor arrecadado (presentes, contribuições, pagamentos), pra
// não ter a mesma expressão toLocaleString espalhada pelo código.

export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatCentsToBRLOrDash(cents: number | null): string {
  return cents === null ? '—' : formatCentsToBRL(cents)
}
