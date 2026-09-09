// `casamentos.nomes_noivos` é uma coluna de texto livre, mas o site inteiro
// espera a convenção "Nome1 & Nome2" para tratar os dois lados separadamente:
// as três linhas do Hero, as iniciais do monograma, a assinatura das
// boas-vindas e a marca curta da barra de navegação.
//
// A divisão vivia copiada em cada um desses lugares, sempre com a mesma
// expressão regular e a mesma decisão silenciosa sobre o que fazer quando o
// nome foge do padrão. Aqui ela é uma só, e a decisão é explícita: fora do
// padrão, `null` — e cada componente escolhe o que fazer com isso, em vez de
// inventar uma letra ou um nome errado.

export interface NomesCasal {
  primeiro: string
  segundo: string
}

/** Divide "Nome1 & Nome2" nos dois lados. `null` para qualquer outro formato. */
export function dividirNomesCasal(nomesNoivos: string | null | undefined): NomesCasal | null {
  const partes = (nomesNoivos ?? '').split(/\s*&\s*/)
  if (partes.length !== 2) return null
  const primeiro = partes[0]?.trim()
  const segundo = partes[1]?.trim()
  return primeiro && segundo ? { primeiro, segundo } : null
}

/**
 * Iniciais do casal em maiúscula, para o monograma. `null` fora do padrão —
 * carimbar a letra errada no site inteiro é pior que não desenhar monograma.
 */
export function iniciaisCasal(nomesNoivos: string | null | undefined): NomesCasal | null {
  const nomes = dividirNomesCasal(nomesNoivos)
  if (!nomes) return null
  const primeiro = nomes.primeiro.charAt(0).toUpperCase()
  const segundo = nomes.segundo.charAt(0).toUpperCase()
  return primeiro && segundo ? { primeiro, segundo } : null
}

/**
 * Só o primeiro nome de cada um: "Mateus Augusto & Raquel Júlia" vira
 * "Mateus & Raquel".
 *
 * Existe para caber onde o nome completo não cabe — a barra de navegação, com
 * cinco destinos e um botão ao lado. `null` fora do padrão, e aí quem chama
 * usa o nome completo como está.
 */
export function primeirosNomesCasal(nomesNoivos: string | null | undefined): string | null {
  const nomes = dividirNomesCasal(nomesNoivos)
  if (!nomes) return null
  const primeiro = nomes.primeiro.split(/\s+/)[0]
  const segundo = nomes.segundo.split(/\s+/)[0]
  return primeiro && segundo ? `${primeiro} & ${segundo}` : null
}
