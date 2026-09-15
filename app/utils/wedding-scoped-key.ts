/**
 * Chave de cache escopada ao casamento ativo (docs/fase5-multievento.md 5.2).
 *
 * A API do painel não leva casamento nenhum na URL — `/api/wedding`,
 * `/api/dashboard/summary` e `/api/guests` são a mesma URL para todos os
 * casamentos, e o servidor resolve qual pelo cookie `casamento_ativo`. Quem
 * separa o payload de um casamento do de outro é, portanto, a chave do
 * `useAsyncData`: sem o slug nela, trocar de evento continua mostrando o dado
 * do anterior — sem erro nenhum, que é o que torna o defeito perigoso.
 *
 * O slug entra SEMPRE, inclusive vazio: uma chave que às vezes carrega e às
 * vezes não é uma regra que alguém precisa lembrar de aplicar, e esta existe
 * justamente para não depender de lembrança.
 */
export function weddingScopedKey(base: string, slug: string): string {
  return `${base}@${slug}`
}
