#!/usr/bin/env node
/**
 * Bootstrap de operador de plataforma — o 5º modelo de confiança (CLAUDE.md
 * seção 4.2): equipe interna do produto, com leitura entre `casamento_id`s,
 * que é coisa diferente de `membros_casamento.papel = 'dono'` (esse é por
 * casamento). `operadores_plataforma` nasceu deny-by-default e sem UI de
 * gestão: a própria migration diz "primeira linha inserida manualmente via
 * service_role". Este script é esse "manualmente", com as travas que a mão
 * não tem.
 *
 * POR QUE UM SCRIPT E NÃO DUAS LINHAS DE SQL: a linha em
 * `operadores_plataforma` é a metade fácil. A outra metade é um usuário em
 * `auth.users`, que não se cria por `insert` — o GoTrue guarda hash de senha e
 * campos internos que um SQL à mão teria de forjar. A Admin API é o único
 * caminho suportado, e ela vive fora do SQL Editor.
 *
 * POR QUE `createUser` E NÃO `inviteUserByEmail` (que é o que
 * `server/utils/usuario-por-email.ts` usa): convite dispara e-mail e deixa a
 * senha para o dono da caixa definir depois. Ali isso é certo — o convidado é
 * um terceiro. Aqui a conta é de quem está rodando o comando, precisa entrar
 * agora, e um e-mail a menos é um e-mail a menos.
 *
 * POR QUE `--ref` É OBRIGATÓRIO E O `.env` NÃO É LIDO: este script ESCREVE, e
 * escrever no projeto errado é a falha muda clássica deste repo (já houve um
 * `.env` apontando pro dev enquanto o CLI apontava pro prod, os dois
 * discordando em silêncio). Herdar credencial de arquivo é exatamente como se
 * acerta o banco que não era pra acertar: aqui o alvo é declarado na linha de
 * comando, conferido contra o `ref` assinado dentro da própria chave, e
 * impresso antes de qualquer escrita.
 *
 * Uso (PowerShell, da raiz do repo):
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<service_role do projeto alvo>"
 *   node scripts/criar-operador-plataforma.mjs --ref <project-ref> --email eu@exemplo.com
 *
 * Senha: gerada e impressa UMA vez se `--senha` não vier. Conta que já existe
 * nunca tem a senha trocada sem `--redefinir-senha` explícito.
 *
 * Rodar de novo com o mesmo e-mail é seguro: reaproveita o usuário e não
 * duplica a linha de operador.
 */

import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)

function arg(nome, padrao = null) {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao
}

function flag(nome) {
  return args.includes(`--${nome}`)
}

function abortar(mensagem) {
  console.error(`\n  x ${mensagem}\n`)
  process.exit(1)
}

const REF = arg('ref')
const EMAIL = arg('email')
const SENHA_INFORMADA = arg('senha')
const REDEFINIR_SENHA = flag('redefinir-senha')
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!REF || !EMAIL) {
  abortar(
    'Informe o projeto e o e-mail:\n' +
      '    node scripts/criar-operador-plataforma.mjs --ref <project-ref> --email eu@exemplo.com',
  )
}
if (!CHAVE) {
  abortar(
    'SUPABASE_SERVICE_ROLE_KEY não está no ambiente desta sessão (o .env não é lido, de propósito).',
  )
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(EMAIL)) {
  abortar(`"${EMAIL}" não parece um e-mail.`)
}

/**
 * A service_role clássica é um JWT cujo payload traz o `ref` do projeto que a
 * assinou — dá pra pegar o descasamento entre chave e `--ref` ANTES de tocar
 * na rede, com mensagem que diz qual é qual. As chaves do formato novo
 * (`sb_secret_…`) não são JWT: aí não dá pra conferir, e o script diz isso em
 * vez de fingir que conferiu.
 */
function refDaChave(chave) {
  const partes = chave.split('.')
  if (partes.length !== 3) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))
    return typeof payload.ref === 'string' ? payload.ref : null
  } catch {
    return null
  }
}

const refAssinado = refDaChave(CHAVE)
if (refAssinado && refAssinado !== REF) {
  abortar(
    `A chave é do projeto "${refAssinado}", mas o alvo declarado é "${REF}".\n` +
      '    Um dos dois está errado — nada foi escrito.',
  )
}

const URL_PROJETO = `https://${REF}.supabase.co`

const admin = createClient(URL_PROJETO, CHAVE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * `listUsers()` sem argumento devolve 50, e a Admin API não tem busca por
 * e-mail — mesmo defeito de paginação que `listarTodosUsuarios()` corrigiu em
 * `server/utils/usuario-por-email.ts`, onde chamar sem paginar fazia o código
 * tentar convidar de novo quem já existia. O teto de páginas é trava contra
 * laço infinito, não limite de produto.
 */
async function acharUsuarioPorEmail(email) {
  const alvo = email.toLowerCase()

  for (let pagina = 1; pagina <= 40; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error) {
      abortar(`Falha ao listar usuários: ${error.message}`)
    }

    const achado = data.users.find((u) => u.email?.toLowerCase() === alvo)
    if (achado) {
      return achado
    }
    if (data.users.length < 1000) {
      return null
    }
  }

  return null
}

function gerarSenha() {
  return randomBytes(18).toString('base64url')
}

console.log(`\n  Projeto ....... ${URL_PROJETO}${refAssinado ? '  (ref conferido contra a chave)' : ''}`)
console.log(`  E-mail ........ ${EMAIL}`)
if (!refAssinado) {
  // Chave no formato novo (`sb_secret_…`), que não carrega o ref: não dá pra
  // conferir antes da rede. A trava que sobra é estrutural e basta — a URL do
  // projeto é construída a partir do `--ref`, então uma chave de outro projeto
  // não escreve no lugar errado, ela falha.
  console.log('                  (chave sem ref embutido — a de outro projeto falha com 401)')
}

const existente = await acharUsuarioPorEmail(EMAIL)
let usuarioId
let senhaParaExibir = null

if (existente) {
  usuarioId = existente.id
  console.log(`  Usuário ....... já existia (criado em ${existente.created_at.slice(0, 10)})`)

  if (REDEFINIR_SENHA) {
    const novaSenha = SENHA_INFORMADA ?? gerarSenha()
    const { error } = await admin.auth.admin.updateUserById(usuarioId, { password: novaSenha })
    if (error) {
      abortar(`Falha ao redefinir a senha: ${error.message}`)
    }
    senhaParaExibir = SENHA_INFORMADA ? null : novaSenha
    console.log('  Senha ......... redefinida')
  } else if (SENHA_INFORMADA) {
    console.log(
      '  Senha ......... intacta (use --redefinir-senha para trocar a de uma conta existente)',
    )
  }
} else {
  const senha = SENHA_INFORMADA ?? gerarSenha()
  // `email_confirm: true` porque ninguém vai clicar em link de confirmação:
  // sem isso o login recusa com "Email not confirmed" e a conta nasce inútil.
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: senha,
    email_confirm: true,
  })
  if (error || !data.user) {
    abortar(`Falha ao criar o usuário: ${error?.message ?? 'resposta sem usuário'}`)
  }
  usuarioId = data.user.id
  senhaParaExibir = SENHA_INFORMADA ? null : senha
  console.log('  Usuário ....... criado e confirmado')
}

const { data: jaOperador, error: erroConsulta } = await admin
  .from('operadores_plataforma')
  .select('usuario_id, created_at')
  .eq('usuario_id', usuarioId)
  .maybeSingle()
if (erroConsulta) {
  abortar(`Falha ao consultar operadores_plataforma: ${erroConsulta.message}`)
}

if (jaOperador) {
  console.log(`  Operador ...... já era, desde ${jaOperador.created_at.slice(0, 10)}`)
} else {
  const { error } = await admin.from('operadores_plataforma').insert({ usuario_id: usuarioId })
  if (error) {
    abortar(`Falha ao inserir em operadores_plataforma: ${error.message}`)
  }
  console.log('  Operador ...... promovido agora')
}

/**
 * Uma conta pode ser operador E dono, e o banco não se importa — mas o login
 * se importa: `app/middleware/auth.global.ts` só desvia pra /plataforma quem
 * tem ZERO casamentos próprios. Com um casamento, o login cai em
 * /admin/<slug> e o painel interno só abre digitando a URL. Vale avisar, não
 * bloquear: acumular os dois papéis é legítimo.
 */
const { data: vinculos } = await admin
  .from('membros_casamento')
  .select('papel, acesso_suporte_expira_em, casamentos(slug)')
  .eq('usuario_id', usuarioId)

const proprios = (vinculos ?? []).filter((v) => v.acesso_suporte_expira_em === null)
if (proprios.length > 0) {
  const slugDe = (v) => (Array.isArray(v.casamentos) ? v.casamentos[0]?.slug : v.casamentos?.slug)
  const descricao = proprios.map((v) => `${slugDe(v) ?? '?'}:${v.papel}`).join(', ')
  console.log(`\n  ! Esta conta também é membro de casamento (${descricao}).`)
  console.log('    O login vai cair no painel do casal, não em /plataforma — que continua')
  console.log('    acessível, mas só digitando a URL.')
}

if (senhaParaExibir) {
  console.log('\n  Senha (anote agora — o banco guarda só o hash, isto não se recupera):')
  console.log(`\n      ${senhaParaExibir}\n`)
}

console.log('\n  Pronto. Entre em /login e abra /plataforma.\n')
