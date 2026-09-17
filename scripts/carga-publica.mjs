#!/usr/bin/env node
/**
 * Teste de carga dos endpoints públicos — a dívida "testes de carga nos
 * endpoints públicos (RSVP, reserva de presentes)" do `docs/ROADMAP.md`.
 *
 * POR QUE UM SCRIPT DE 150 LINHAS E NÃO k6/artillery: o alvo aqui é o pico
 * real de um casamento, que é modesto e conhecido — o convite sai no WhatsApp
 * e algumas dezenas de pessoas abrem o link nos dez minutos seguintes. Isso se
 * mede com requisições concorrentes e percentis; uma ferramenta dedicada
 * traria instalação, uma linguagem de script própria e um binário a versionar
 * para responder exatamente a mesma pergunta.
 *
 * O QUE ELE NÃO FAZ, de propósito: não escreve nada. Só rotas de LEITURA
 * entram — carregar o site, listar presentes, buscar um nome. Disparar
 * reservas de verdade em lote criaria dado real (e, contra produção, roubaria
 * estoque de presente de gente de verdade). O caminho de escrita é protegido
 * por outra coisa, que já existe e é testada: a função Postgres com
 * `SELECT ... FOR UPDATE` (CLAUDE.md seção 10), onde a concorrência é
 * resolvida por transação e não por capacidade de servidor.
 *
 * Uso:
 *   node scripts/carga-publica.mjs --base http://localhost:3300 --slug teste-dev
 *   node scripts/carga-publica.mjs --slug meu-casamento --concorrencia 30 --duracao 20
 *
 * Contra PRODUÇÃO, pense duas vezes: o rate limiting (Upstash) vai responder
 * 429 e o que você vai medir é o limitador, não a aplicação. O valor deste
 * script é num ambiente de teste com dado parecido com o real.
 */

const args = process.argv.slice(2)

function arg(nome, padrao) {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao
}

const BASE = arg('base', 'http://localhost:3000').replace(/\/$/, '')
const SLUG = arg('slug', '')
const CONCORRENCIA = Number(arg('concorrencia', '20'))
const DURACAO_S = Number(arg('duracao', '15'))
/**
 * Três letras, nunca uma: a busca por nome recusa termo mais curto que isso
 * ("Digite ao menos 3 letras."), então o padrão anterior — `a` — fazia o
 * cenário inteiro medir uma validação de 400, não uma busca. Apareceu na
 * primeira execução de verdade do script, em 2026-09-16: dez respostas 400
 * entre as 559, todas deste cenário.
 */
const BUSCA = arg('busca', 'ana')

if (!SLUG) {
  console.error('Informe o casamento: --slug <slug-do-casamento>')
  process.exit(1)
}

/**
 * Os três caminhos que o convidado realmente percorre, na proporção em que ele
 * os percorre: todo mundo abre o site, boa parte abre os presentes, uma fração
 * busca o próprio nome. Distribuir igualmente mediria um uso que não existe.
 */
const CENARIOS = [
  { nome: 'site', peso: 5, url: () => `${BASE}/api/public/${SLUG}/wedding` },
  { nome: 'presentes', peso: 3, url: () => `${BASE}/api/public/${SLUG}/gifts` },
  {
    nome: 'busca de nome',
    peso: 2,
    url: () => `${BASE}/api/public/${SLUG}/rsvp-search?q=${encodeURIComponent(BUSCA)}`,
  },
]

const sorteio = CENARIOS.flatMap((cenario) => Array(cenario.peso).fill(cenario))
const amostras = new Map(CENARIOS.map((cenario) => [cenario.nome, []]))
const status = new Map()

let rodando = true

async function trabalhador() {
  while (rodando) {
    const cenario = sorteio[Math.floor(Math.random() * sorteio.length)]
    const inicio = performance.now()

    try {
      const resposta = await fetch(cenario.url(), { headers: { accept: 'application/json' } })
      // O corpo precisa ser consumido: sem isso a conexão fica presa e o
      // número medido é o do handshake, não o da resposta inteira.
      await resposta.arrayBuffer()
      registrar(cenario.nome, performance.now() - inicio, resposta.status)
    } catch (erro) {
      registrar(cenario.nome, performance.now() - inicio, 'erro de rede')
      if (process.env.DEBUG) console.error(erro)
    }
  }
}

function registrar(cenario, duracaoMs, codigo) {
  amostras.get(cenario).push(duracaoMs)
  status.set(codigo, (status.get(codigo) ?? 0) + 1)
}

function percentil(valores, p) {
  if (!valores.length) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const indice = Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length))
  return ordenados[indice]
}

console.log(`Alvo: ${BASE} · casamento "${SLUG}"`)
console.log(`${CONCORRENCIA} requisições simultâneas por ${DURACAO_S}s\n`)

const inicio = performance.now()
setTimeout(() => {
  rodando = false
}, DURACAO_S * 1000)

await Promise.all(Array.from({ length: CONCORRENCIA }, () => trabalhador()))

const segundos = (performance.now() - inicio) / 1000
const total = [...amostras.values()].reduce((soma, lista) => soma + lista.length, 0)

console.log('Cenário            reqs      p50       p95       p99')
for (const [nome, lista] of amostras) {
  console.log(
    nome.padEnd(18) +
      String(lista.length).padStart(5) +
      `${percentil(lista, 50).toFixed(0)}ms`.padStart(10) +
      `${percentil(lista, 95).toFixed(0)}ms`.padStart(10) +
      `${percentil(lista, 99).toFixed(0)}ms`.padStart(10),
  )
}

console.log(
  `\n${total} requisições em ${segundos.toFixed(1)}s (${(total / segundos).toFixed(1)}/s)`,
)
console.log('Respostas:', Object.fromEntries(status))

// Um 429 no meio do resultado não é falha do teste — é o rate limiting
// funcionando. Mas precisa aparecer em destaque, senão o p95 é lido como se
// descrevesse respostas completas.
if ([...status.keys()].includes(429)) {
  console.log('\n⚠  Houve 429: parte do que foi medido é o rate limiting, não a aplicação.')
}

const erros = [...status.entries()]
  .filter(([codigo]) => codigo === 'erro de rede' || Number(codigo) >= 500)
  .reduce((soma, [, quantidade]) => soma + quantidade, 0)

if (erros > 0) {
  console.log(`\n✗ ${erros} respostas de erro (5xx ou rede).`)
  process.exit(1)
}
