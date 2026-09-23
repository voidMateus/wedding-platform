/**
 * Publica os quatro e-mails do Auth num projeto Supabase.
 *
 * Os templates são configuração **do projeto**, não do repositório: o que vive
 * em `supabase/templates/` é a fonte versionada, e levá-la ao ar era colar
 * quatro HTMLs e digitar quatro assuntos no dashboard, ambiente por ambiente.
 * Oito campos à mão por ambiente, sem nada conferindo o resultado — e o
 * ambiente esquecido continua mandando o link no formato antigo, que é
 * exatamente a falha muda que estes templates vieram consertar.
 *
 *   node scripts/publicar-templates-de-email.mjs --ref <project-ref>
 *
 * O token é um Personal Access Token da conta
 * (https://supabase.com/dashboard/account/tokens), lido de
 * `SUPABASE_ACCESS_TOKEN` no ambiente ou no `.env`. Ele alcança **todos** os
 * projetos da conta, e é por isso que `--ref` é obrigatório e não tem padrão: o
 * alvo é sempre digitado, nunca herdado de um `supabase link` anterior — que é
 * como o CLI já apontou para produção enquanto o `.env` dizia dev.
 *
 * O que este script deliberadamente **não** toca: `site_url` e a allowlist de
 * redirect. Os dois variam por ambiente, e um script que os igualasse mandaria
 * todo e-mail de produção para `localhost`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEMPLATES } from './templates-de-email.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://api.supabase.com/v1'

function lerTemplateDoRepositorio(arquivo) {
  return readFileSync(join(RAIZ, 'supabase', 'templates', arquivo), 'utf8').replaceAll('\r\n', '\n')
}

/**
 * Os oito campos que a Management API espera — dois por template.
 *
 * O assunto é campo separado do corpo, e é o que se perde quando a publicação é
 * manual: o dashboard não o importa junto do HTML, então um template em
 * português chegava com "Your sign-in link" na linha de assunto.
 */
export function montarPayloadDeEmails(lerTemplate = lerTemplateDoRepositorio) {
  const payload = {}

  for (const template of Object.values(TEMPLATES)) {
    payload[`mailer_templates_${template.campoDaApi}_content`] = lerTemplate(template.arquivo)
    payload[`mailer_subjects_${template.campoDaApi}`] = template.assunto
  }

  return payload
}

function lerToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN

  try {
    const dotenv = readFileSync(join(RAIZ, '.env'), 'utf8')
    const doArquivo = /^SUPABASE_ACCESS_TOKEN\s*=\s*(.+)$/m.exec(dotenv)?.[1]
    if (doArquivo) return doArquivo.trim().replace(/^["']|["']$/g, '')
  } catch {
    // Sem `.env` a mensagem de erro de quem chamou já diz o que falta.
  }

  return null
}

async function chamarApi(caminho, token, init = {}) {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!resposta.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${caminho} devolveu ${resposta.status}: ${await resposta.text()}`,
    )
  }

  return resposta.json()
}

/**
 * Escreve e **confere**.
 *
 * A releitura não é zelo: um `PATCH` aceito diz que a requisição chegou, não
 * que os oito campos ficaram como o repositório os tem. A prova é comparar o
 * que voltou com o arquivo — a mesma razão pela qual promover migration se
 * confere pelo schema, e não pela mensagem do CLI.
 */
export async function publicarTemplatesDeEmail(ref, token) {
  const payload = montarPayloadDeEmails()

  await chamarApi(`/projects/${ref}/config/auth`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  const depois = await chamarApi(`/projects/${ref}/config/auth`, token)
  let divergencias = 0

  for (const template of Object.values(TEMPLATES)) {
    const conteudo = depois[`mailer_templates_${template.campoDaApi}_content`] ?? ''
    const assunto = depois[`mailer_subjects_${template.campoDaApi}`] ?? ''
    const esperado = payload[`mailer_templates_${template.campoDaApi}_content`]
    const igual = conteudo.trim() === esperado.trim() && assunto === template.assunto

    if (!igual) divergencias += 1
    console.log(`${igual ? 'ok  ' : 'ERRO'} ${template.arquivo.padEnd(18)} ${template.ondeColar}`)
  }

  // O Site URL não é escrito por aqui, mas é ele que monta o link de todos os
  // quatro (`{{ .SiteURL }}`) — mostrá-lo é o que transforma "publiquei" em
  // "publiquei no ambiente certo".
  console.log(`\nSite URL deste projeto: ${depois.site_url}`)
  console.log('É dele que sai o link dos quatro e-mails.')

  return divergencias
}

// Caminho inteiro, e não sufixo — ver a nota gêmea em `templates-de-email.mjs`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const posicao = process.argv.indexOf('--ref')
  const ref = posicao > -1 ? process.argv[posicao + 1] : undefined

  if (!ref || ref.startsWith('--')) {
    console.error('uso: node scripts/publicar-templates-de-email.mjs --ref <project-ref>')
    process.exit(1)
  }

  const token = lerToken()

  if (!token) {
    console.error(
      'SUPABASE_ACCESS_TOKEN não encontrado (nem no ambiente, nem no .env).\n' +
        'Gere um em https://supabase.com/dashboard/account/tokens',
    )
    process.exit(1)
  }

  const divergencias = await publicarTemplatesDeEmail(ref, token)
  process.exit(divergencias === 0 ? 0 : 1)
}
