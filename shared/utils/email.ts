/**
 * E-mail do convidado, normalizado — o par do `normalizarTelefoneE164` para o
 * outro canal.
 *
 * O cadastro guarda o e-mail **como digitado** (é dado de envio, nunca chave
 * de busca), então aqui chega de tudo: espaço sobrando, maiúscula, e o campo
 * que o casal preencheu com "não tem".
 *
 * **Recusar é parte do contrato**, pelo mesmo motivo do telefone: um envio
 * para um endereço inválido some no provedor e o casal fica achando que
 * mandou. Endereço que não passa devolve `null`, e a tela mostra "sem e-mail"
 * em vez de um botão que finge funcionar.
 *
 * A validação é **de forma, não de existência** — nenhum formato prova que a
 * caixa existe, e é por isso que o bounce do provedor é registrado depois
 * (`eventos_email`): é ele que diz se chegou.
 */

/**
 * Deliberadamente mais simples que a gramática do RFC 5322: local@dominio.tld,
 * sem espaço, com um ponto no domínio. Uma regex "completa" de RFC aceita
 * coisas que nenhum provedor entrega (comentário entre parênteses, aspas no
 * local) e é impossível de revisar. O que escapar daqui, o provedor recusa —
 * e aí vira um bounce registrado, que é o lugar certo dessa verdade.
 */
const PADRAO_EMAIL = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/

export function normalizarEmail(bruto: string | null | undefined): string | null {
  if (!bruto) return null

  // Minúsculas só no DOMÍNIO: a parte local é tecnicamente sensível a caixa
  // (o RFC permite), e embora nenhum provedor grande use isso, reescrever o
  // endereço que a pessoa deu é passar por cima de um dado que não é nosso.
  const limpo = bruto.trim()
  if (!PADRAO_EMAIL.test(limpo)) return null

  const arroba = limpo.lastIndexOf('@')
  return `${limpo.slice(0, arroba)}@${limpo.slice(arroba + 1).toLowerCase()}`
}

/** Há como falar com esta pessoa por e-mail? */
export function temEmail(email: string | null | undefined): boolean {
  return normalizarEmail(email) !== null
}
