import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Nada do painel atravessa a troca de casamento
 * (docs/fase5-multievento.md 5.2, invariante 1).
 *
 * A API do painel não leva casamento na URL — o servidor resolve pelo cookie
 * `casamento_ativo` —, então quem separa o payload de um casal do de outro é
 * a chave do `useAsyncData`. Corrigir as chaves de hoje não impede a de
 * amanhã: esta varredura é o que impede, falhando quando um composable nasce
 * com chave global.
 *
 * Verificação estrutural, como `auditoria-completa.spec.ts`. Um teste de
 * comportamento por composable precisaria montar Nuxt, rota e Supabase, e
 * ainda assim não diria nada sobre o composable que ninguém lembrou de
 * cobrir — que é justamente o que importa aqui.
 */

const RAIZ = join(process.cwd(), 'app', 'composables')

/**
 * Composables do site PÚBLICO não passam por aqui: eles recebem o slug como
 * argumento e já o carregam na chave (`public-wedding-${slug}`), porque a URL
 * da API pública leva o casamento. O recorte é pelo prefixo do nome, que é a
 * convenção do próprio diretório.
 */
const PUBLICOS = /^usePublic/

/**
 * O painel INTERNO é deliberadamente cross-tenant (CLAUDE.md 4.2, 5º modelo de
 * confiança): escopar estas chaves a um casamento seria o oposto do que as
 * telas fazem. Cada dispensa é uma decisão, e acrescentar uma aqui deveria
 * doer — por isso a lista é de nomes, e não um prefixo `^usePlatform` que
 * dispensaria sozinho o próximo composable que alguém criasse.
 *
 * - `usePlatformOverview`: a lista de casamentos e o diagnóstico.
 * - `usePlatformAccounts` (Fase 6): operadores da plataforma e a consulta de
 *   "quem tem acesso a quê". Operador não pertence a casamento nenhum, e a
 *   consulta atravessa todos por definição.
 */
const FORA_DO_PAINEL = ['usePlatformOverview.ts', 'usePlatformAccounts.ts']

function arquivosDe(diretorio: string): string[] {
  const encontrados: string[] = []

  for (const entrada of readdirSync(diretorio)) {
    const caminho = join(diretorio, entrada)
    if (statSync(caminho).isDirectory()) {
      encontrados.push(...arquivosDe(caminho))
    } else if (caminho.endsWith('.ts')) {
      encontrados.push(caminho)
    }
  }

  return encontrados
}

const composables = arquivosDe(RAIZ)
  .map((caminho) => relative(RAIZ, caminho).replaceAll('\\', '/'))
  .filter((nome) => !PUBLICOS.test(nome))
  .filter((nome) => !FORA_DO_PAINEL.includes(nome))
  .filter((nome) => /\bkey:/.test(readFileSync(join(RAIZ, nome), 'utf8')))

describe('escopo por casamento', () => {
  it('encontra os composables do painel que definem chave de cache', () => {
    // Guarda contra o teste passar por vacuidade: uma mudança de estrutura de
    // pastas que zerasse a varredura deixaria a suíte verde sem verificar nada.
    expect(composables.length).toBeGreaterThan(10)
  })

  it.each(composables)('%s escopa toda chave de cache ao casamento ativo', (nome) => {
    const conteudo = readFileSync(join(RAIZ, nome), 'utf8')

    // Uma chave içada para `const` é escopada do mesmo jeito — e é o padrão
    // de quem também precisa dela em `refreshNuxtData`. O que a varredura
    // procura é chave que NUNCA passou pelo helper, não a forma de escrevê-la.
    const içadas = new Set(
      [...conteudo.matchAll(/const\s+(\w+)\s*=\s*useWeddingScopedKey\(/g)].map(
        ([, ident]) => ident,
      ),
    )

    // `key:` de coluna de tabela não é chave de cache — só as que o Nuxt usa
    // como identidade de requisição interessam, e essas vivem dentro de um
    // `useFetch`/`useAsyncData`.
    const chavesDeCache = [
      ...conteudo.matchAll(/use(?:Fetch|AsyncData)[\s\S]{0,600}?\bkey:\s*([^\n]+)/g),
    ]

    for (const [, valor] of chavesDeCache) {
      const bruto = (valor ?? '').trim()
      // A chave içada é sempre um identificador solto; o resto da linha
      // (`,`, `})`) é sintaxe do objeto de opções em volta.
      const identificador = bruto.split(/[,}]/)[0]?.trim() ?? ''
      const escopada = /useWeddingScopedKey\(/.test(bruto) || içadas.has(identificador)

      expect(escopada, `${nome}: chave de cache "${bruto}" não passa por useWeddingScopedKey`).toBe(
        true,
      )
    }
  })

  /**
   * A outra metade da mesma regra: escopar a chave da requisição não adianta
   * se a INVALIDAÇÃO mira outra coisa.
   *
   * `useOnboarding` registrava `onboarding@<slug>` e invalidava `'onboarding'`
   * — uma chave que nenhuma requisição carrega. O roteiro de Primeiros passos
   * nunca era relido, e o casal terminava as etapas para ler "0 de 4
   * concluídos" (rodada de usabilidade de 20/09/2026, ponto 7).
   *
   * A falha é muda nos dois sentidos: o refresh não erra, ele simplesmente não
   * encontra nada para atualizar. Por isso a varredura — corrigir a chave de
   * hoje não impede a de amanhã.
   */
  const comInvalidacao = composables.filter((nome) =>
    /app:data:refresh|refreshNuxtData\(/.test(readFileSync(join(RAIZ, nome), 'utf8')),
  )

  it('encontra os composables do painel que invalidam cache', () => {
    expect(comInvalidacao.length).toBeGreaterThan(2)
  })

  it.each(comInvalidacao)('%s invalida a chave resolvida, nunca a base crua', (nome) => {
    const conteudo = readFileSync(join(RAIZ, nome), 'utf8')

    const içadas = new Set(
      [...conteudo.matchAll(/const\s+(\w+)\s*=\s*useWeddingScopedKey\(/g)].map(
        ([, ident]) => ident,
      ),
    )

    const invalidadas = [
      // `callHookParallel('app:data:refresh', [ ... ])` — o array inteiro.
      ...[...conteudo.matchAll(/app:data:refresh['"]\s*,\s*\[([^\]]*)\]/g)].flatMap(([, lista]) =>
        (lista ?? '').split(',').map((item) => item.trim()),
      ),
      // `refreshNuxtData(...)` — um argumento por chamada.
      ...[...conteudo.matchAll(/refreshNuxtData\(([^)]*\)?)\)/g)].map(([, arg]) =>
        (arg ?? '').trim(),
      ),
    ].filter(Boolean)

    for (const alvo of invalidadas) {
      // Só a chave **chamada** vale: `chaveRoteiro()` resolve para
      // `onboarding@<slug>`; `chaveRoteiro` (sem chamar) é a função, e
      // `'onboarding'` é a base que ninguém registrou.
      const identificador = alvo.match(/^(\w+)\(\)$/)?.[1]

      expect(
        Boolean(identificador && içadas.has(identificador)),
        `${nome}: invalidação de "${alvo}" não usa uma chave de useWeddingScopedKey resolvida`,
      ).toBe(true)
    }
  })
})
