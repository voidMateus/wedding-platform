/**
 * Os e-mails do Supabase Auth, com a cara da plataforma.
 *
 * Eles são **configuração do projeto Supabase**, não do repositório: quem os
 * renderiza é o GoTrue, a partir de um HTML colado no dashboard. O que este
 * arquivo faz é gerar esse HTML a partir de uma casca só, e o resultado fica
 * versionado em `supabase/templates/` — sem isso, os quatro textos existiriam
 * apenas dentro de três dashboards, e ninguém saberia se os três combinam.
 *
 * Uma casca, quatro mensagens, pelo mesmo motivo de `shared/home-sections.ts`
 * ser a fonte única das seções: quatro arquivos HTML editados à mão divergem no
 * primeiro ajuste, e a divergência aparece meses depois, num e-mail que só uma
 * pessoa recebe.
 *
 * **A cor é a da plataforma** (`--color-primary` de `.marca-da-plataforma`), e
 * não a do casamento: quem recebe isto está entrando na ferramenta, não vendo o
 * site de um casal. É a mesma razão pela qual o painel interno não empresta a
 * cor de um tema de casamento (CLAUDE.md, seção 13).
 *
 * Regras de cliente de e-mail, iguais às de `server/utils/email-layout.ts` e
 * pelo mesmo motivo: tabela em vez de flex/grid (Outlook), estilo inline em vez
 * de classe (Gmail descarta `<style>` em alguns contextos), 600px de largura e
 * nenhuma fonte externa.
 *
 * Gerar: `node scripts/templates-de-email.mjs`
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUTO = 'MeuSiteCasamento'

/** `--color-primary` de `.marca-da-plataforma` (app/assets/css/main.css). */
const COR = '#44507a'
const TEXTO = '#2f2a26'
const TEXTO_SUAVE = '#6f6862'
const FUNDO = '#f7f4f1'
const BORDA = '#ece7e2'

/**
 * O endereço de volta.
 *
 * `{{ .SiteURL }}` e não `{{ .RedirectTo }}`: o segundo depende de a chamada ter
 * passado um `emailRedirectTo` **e** de ele estar na allowlist do projeto, e
 * quando qualquer uma das duas falha o GoTrue substitui pelo Site URL em
 * silêncio — o link viraria a raiz do domínio, que foi exatamente o defeito do
 * ponto 5 da rodada de usabilidade. Com `{{ .SiteURL }}` o destino é o mesmo
 * sempre, e o preço é conhecido: em deploy de preview o link cai no ambiente do
 * Site URL, então lá se entra por e-mail e senha.
 *
 * `{{ .TokenHash }}` e não `{{ .ConfirmationURL }}`: é o que faz a verificação
 * acontecer no SERVIDOR (`server/routes/auth/confirmar.get.ts`), sem depender
 * de storage do navegador — e é o que faz o link funcionar no celular quando
 * foi pedido no computador.
 */
function linkDeAcesso(tipo) {
  return `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=${tipo}`
}

/**
 * As quatro mensagens. Cada uma responde três coisas na ordem em que quem lê
 * pergunta: o que é isto, por que chegou para mim, e o que fazer agora.
 */
export const TEMPLATES = {
  convite: {
    arquivo: 'convite.html',
    ondeColar: 'Authentication → Emails → Invite user',
    assunto: `Seu acesso ao ${PRODUTO}`,
    titulo: 'Seu site de casamento está pronto para começar',
    paragrafos: [
      `O ${PRODUTO} é onde vocês organizam o site do casamento, a lista de convidados, as confirmações de presença e a lista de presentes — tudo num lugar só.`,
      'Criamos o evento de vocês e este é o acesso do casal. O primeiro passo é definir uma senha.',
    ],
    botao: 'Definir minha senha',
    tipo: 'invite',
    rodape: `Você recebeu este e-mail porque o seu endereço foi cadastrado como responsável por um casamento no ${PRODUTO}.`,
  },

  'link-magico': {
    arquivo: 'link-magico.html',
    ondeColar: 'Authentication → Emails → Magic Link',
    assunto: `Seu link de acesso ao ${PRODUTO}`,
    titulo: 'Entrar sem senha',
    paragrafos: [
      'Use o botão abaixo para entrar no painel do seu casamento. O link vale por pouco tempo e só pode ser usado uma vez.',
    ],
    botao: 'Entrar',
    tipo: 'magiclink',
    rodape:
      'Se não foi você quem pediu este link, pode ignorar este e-mail — nada acontece até alguém clicar nele.',
  },

  recuperacao: {
    arquivo: 'recuperacao.html',
    ondeColar: 'Authentication → Emails → Reset Password',
    assunto: `Redefinir sua senha do ${PRODUTO}`,
    titulo: 'Escolher uma nova senha',
    paragrafos: [
      'Recebemos um pedido para redefinir a senha da sua conta. O botão abaixo leva direto para a tela onde você escolhe a nova.',
    ],
    botao: 'Redefinir minha senha',
    tipo: 'recovery',
    rodape:
      'Se não foi você quem pediu, pode ignorar este e-mail — sua senha atual continua valendo.',
  },

  confirmacao: {
    arquivo: 'confirmacao.html',
    ondeColar: 'Authentication → Emails → Confirm signup',
    assunto: `Confirme seu e-mail no ${PRODUTO}`,
    titulo: 'Confirmar seu endereço de e-mail',
    paragrafos: [
      'Falta um passo para o seu acesso ficar pronto: confirmar que este endereço é seu.',
    ],
    botao: 'Confirmar meu e-mail',
    tipo: 'signup',
    rodape: 'Se não foi você quem criou esta conta, pode ignorar este e-mail.',
  },
}

function montarHtml(template) {
  const url = linkDeAcesso(template.tipo)

  const paragrafos = template.paragrafos
    .map(
      (texto) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXTO};">${texto}</p>`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${template.titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:${FUNDO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FUNDO};padding:24px 12px;">
<tr>
<td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;">
<tr>
<td style="padding:32px 32px 8px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.08em;text-transform:uppercase;color:${COR};">${PRODUTO}</div>
<div style="margin:16px auto 0;width:48px;border-top:1px solid ${COR};opacity:0.5;"></div>
</td>
</tr>
<tr>
<td style="padding:24px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.4;color:${TEXTO};">${template.titulo}</h1>
${paragrafos}
</td>
</tr>
<tr>
<td style="padding:8px 32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:6px;background-color:${COR};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">${template.botao}</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${TEXTO_SUAVE};">Se o botão não funcionar, copie e cole este endereço no navegador:<br /><span style="word-break:break-all;">${url}</span></p>
</td>
</tr>
<tr>
<td style="padding:8px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${TEXTO_SUAVE};border-top:1px solid ${BORDA};padding-top:20px;">
${template.rodape}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`
}

/** Os quatro HTMLs, prontos para comparação ou escrita. */
export function montarTemplatesDeEmail() {
  return Object.fromEntries(
    Object.values(TEMPLATES).map((template) => [template.arquivo, montarHtml(template)]),
  )
}

const ESTE_ARQUIVO = fileURLToPath(import.meta.url)

if (process.argv[1] && process.argv[1].endsWith('templates-de-email.mjs')) {
  const destino = join(dirname(ESTE_ARQUIVO), '..', 'supabase', 'templates')
  mkdirSync(destino, { recursive: true })

  for (const [arquivo, html] of Object.entries(montarTemplatesDeEmail())) {
    writeFileSync(join(destino, arquivo), html, 'utf8')
    console.log(`gerado: supabase/templates/${arquivo}`)
  }
}
