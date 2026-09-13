/**
 * O layout do e-mail — o mesmo texto do WhatsApp, dentro de uma casca que
 * sobrevive a cliente de e-mail.
 *
 * **O texto é o do casal, intacto.** Não há um segundo modelo "versão e-mail":
 * `modelo-comunicacao.ts` é a fonte única, e é ele que impede os dois canais
 * de divergirem no primeiro ajuste (a lição do catálogo de atalhos do Hero).
 * O que este arquivo acrescenta é só apresentação: tipografia, a cor do
 * casamento e o rodapé que diz por que aquela pessoa recebeu isto.
 *
 * **Sem botão de ação separado.** O link já está onde o casal o escreveu, no
 * meio da frase dele — aqui ele só vira clicável. Um botão embaixo repetiria
 * o mesmo endereço duas vezes na mesma mensagem, e movê-lo para fora da frase
 * exigiria costurar o texto do casal (a mesma cirurgia que `renderizarModelo`
 * recusa fazer).
 *
 * Regras de cliente de e-mail que ditam a forma daqui, e que não são estilo:
 * tabela em vez de flex/grid (Outlook), estilo inline em vez de classe (Gmail
 * remove `<style>` em alguns contextos), largura fixa de 600px, e nenhuma
 * fonte externa — a família do casamento não sobreviveria ao download.
 */

interface LayoutDeEmail {
  /** Texto já renderizado, com as variáveis resolvidas. */
  texto: string
  nomesNoivos: string
  /** Cor primária do casamento (`config_tema.primaryColor`), se houver. */
  corPrimaria?: string | null
  /** Endereço do site público, para o rodapé. */
  urlDoSite?: string | null
}

/** O tom neutro do design system, para casamento sem tema configurado. */
const COR_PADRAO = '#8b6f5c'

const TEXTO = '#2f2a26'
const TEXTO_SUAVE = '#6f6862'
const FUNDO = '#f7f4f1'

export function montarHtmlDeEmail(dados: LayoutDeEmail): string {
  const cor = corSegura(dados.corPrimaria) ?? COR_PADRAO
  const casal = escaparHtml(dados.nomesNoivos)

  const paragrafos = dados.texto
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map(
      (bloco) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXTO};">${autoLink(escaparHtml(bloco), cor)}</p>`,
    )
    .join('')

  // Texto de pré-visualização: é o que a caixa de entrada mostra ao lado do
  // assunto. Sem ele, o cliente de e-mail preenche esse espaço com o começo do
  // HTML — normalmente o nome do casal repetido do cabeçalho.
  const previa = escaparHtml(dados.texto.replace(/\s+/g, ' ').slice(0, 120))

  const rodapeSite = dados.urlDoSite
    ? `<br /><a href="${escaparAtributo(dados.urlDoSite)}" style="color:${TEXTO_SUAVE};">${escaparHtml(semProtocolo(dados.urlDoSite))}</a>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${casal}</title>
</head>
<body style="margin:0;padding:0;background-color:${FUNDO};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FUNDO};padding:24px 12px;">
<tr>
<td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;">
<tr>
<td style="padding:32px 32px 8px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;color:${cor};">${casal}</div>
<div style="margin:16px auto 0;width:48px;border-top:1px solid ${cor};opacity:0.5;"></div>
</td>
</tr>
<tr>
<td style="padding:24px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${paragrafos}
</td>
</tr>
<tr>
<td style="padding:8px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${TEXTO_SUAVE};border-top:1px solid #ece7e2;padding-top:20px;">
Você recebeu esta mensagem porque ${casal} convidou você para o casamento deles.${rodapeSite}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
}

/**
 * O assunto. Curto e sem o nome do tipo de envio ("Lembrete:"), porque quem
 * recebe não organiza a caixa dele pelo funil do casal — o que identifica a
 * mensagem é de quem ela é.
 */
export function assuntoDeEmail(
  nomesNoivos: string,
  tipo: 'convite' | 'lembrete' | 'aviso',
): string {
  if (tipo === 'lembrete') return `Confirme sua presença — ${nomesNoivos}`
  if (tipo === 'aviso') return nomesNoivos
  return `Casamento de ${nomesNoivos}`
}

/** `<` e `&` num nome de casal ou numa mensagem não podem virar marcação. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escaparAtributo(valor: string): string {
  return escaparHtml(valor).replace(/'/g, '&#39;')
}

/**
 * Transforma o endereço que o casal escreveu no texto em link clicável.
 *
 * Roda DEPOIS do escape, sobre texto já seguro — por isso casa `&amp;` como
 * parte da URL. O contrário (linkar antes de escapar) transformaria a marcação
 * que ele gerasse em HTML de verdade.
 */
function autoLink(textoEscapado: string, cor: string): string {
  return textoEscapado
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) =>
        `<a href="${url}" style="color:${cor};font-weight:600;text-decoration:underline;">${url}</a>`,
    )
    .replace(/\n/g, '<br />')
}

/** Só `#rgb`/`#rrggbb` entram no HTML — o resto cai no tom padrão. */
function corSegura(valor: string | null | undefined): string | null {
  if (!valor) return null
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(valor.trim()) ? valor.trim() : null
}

function semProtocolo(url: string): string {
  return url.replace(/^https?:\/\//, '')
}
