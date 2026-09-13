/**
 * Telefone do convidado, normalizado para E.164 — o formato que o `wa.me`
 * exige (só dígitos, com DDI, sem `+` nem máscara).
 *
 * O cadastro guarda o telefone **como digitado** (é dado de envio de convite,
 * nunca chave de busca), então aqui chega de tudo: `(31) 99999-8888`,
 * `31999998888`, `+55 31 99999-8888`, `5531999998888`.
 *
 * **Recusar é parte do contrato.** Um `wa.me` para um número inválido abre uma
 * conversa com ninguém, e o casal só descobre depois de achar que mandou — por
 * isso um número que não dá E.164 devolve `null`, e a tela mostra "sem
 * telefone" em vez de um botão que finge funcionar.
 */

/** Brasil. Único DDI assumido quando o número vem sem ele. */
const DDI_BRASIL = '55'

/**
 * Número brasileiro completo é DDD (2) + assinante (8 fixo ou 9 celular).
 * Menos que isso é número local sem DDD — e adivinhar o DDD do convidado pela
 * cidade do casamento seria inventar dado.
 */
const MIN_DIGITOS_NACIONAL = 10
const MAX_DIGITOS_NACIONAL = 11

/** Faixa da E.164: 8 a 15 dígitos, DDI incluído. */
const MIN_DIGITOS_E164 = 8
const MAX_DIGITOS_E164 = 15

export function normalizarTelefoneE164(bruto: string | null | undefined): string | null {
  if (!bruto) return null

  const digitos = bruto.replace(/\D/g, '')
  if (!digitos) return null

  // Veio com `+`: é o próprio autor dizendo que o DDI está ali. Convidado que
  // mora fora entra por este caminho, e é o único — sem o `+`, não há como
  // distinguir um DDI estrangeiro de um DDD brasileiro.
  if (bruto.trim().startsWith('+')) {
    return digitos.length >= MIN_DIGITOS_E164 && digitos.length <= MAX_DIGITOS_E164 ? digitos : null
  }

  // Já tem o 55 na frente e o resto tem cara de número nacional completo.
  if (digitos.startsWith(DDI_BRASIL)) {
    const semDdi = digitos.slice(DDI_BRASIL.length)
    if (semDdi.length >= MIN_DIGITOS_NACIONAL && semDdi.length <= MAX_DIGITOS_NACIONAL) {
      return digitos
    }
  }

  if (digitos.length >= MIN_DIGITOS_NACIONAL && digitos.length <= MAX_DIGITOS_NACIONAL) {
    return `${DDI_BRASIL}${digitos}`
  }

  return null
}

/** Há como falar com esta pessoa pelo WhatsApp? */
export function temWhatsApp(telefone: string | null | undefined): boolean {
  return normalizarTelefoneE164(telefone) !== null
}

/**
 * O link que abre a conversa com a mensagem já escrita.
 *
 * `wa.me` e não `api.whatsapp.com`: é o encurtador oficial, abre o app no
 * celular e o WhatsApp Web no desktop sem página intermediária.
 */
export function montarLinkWhatsApp(
  telefone: string | null | undefined,
  texto: string,
): string | null {
  const numero = normalizarTelefoneE164(telefone)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
