import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `podeGerenciarPapel()` é a autoridade única sobre "quem pode gerenciar quem"
 * (docs/fase5-multievento.md 4.5).
 *
 * Enquanto a hierarquia coube num `if`, ela viveu escrita à mão em dois
 * lugares (`context.role !== 'dono'`). Com três papéis isso deixa de ser
 * aceitável: a próxima rota que precisar da regra vai comparar strings de
 * novo, e no dia em que a escada mudar haverá duas versões dela — uma das
 * quais ninguém vai lembrar de atualizar.
 *
 * O que a varredura procura é a comparação do papel do ATOR (`context.role`),
 * que é a decisão de autorização. Comparar o papel de um ALVO continua
 * legítimo e aparece no produto: `members/[id].delete.ts` conta quantos donos
 * existem para não deixar o casamento órfão — isso não é hierarquia, é a
 * trava do último dono.
 *
 * Mesmo molde de `auditoria-completa.spec.ts`: estrutural, e falha quando uma
 * rota nova nasce errada, que é o único momento em que a correção é barata.
 */

const RAIZ = join(process.cwd(), 'server', 'api')

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

const rotas = arquivosDe(RAIZ).map((caminho) => relative(RAIZ, caminho).replaceAll('\\', '/'))

/** `context.role === 'dono'`, `contexto.role !== 'colaborador'`, e afins. */
const COMPARACAO_DE_PAPEL_DO_ATOR = /\.role\s*[!=]==\s*['"]/

describe('escada de papéis', () => {
  it('encontra as rotas do servidor', () => {
    expect(rotas.length).toBeGreaterThan(50)
  })

  it.each(rotas)('%s não reimplementa a hierarquia de papéis', (rota) => {
    const conteudo = readFileSync(join(RAIZ, rota), 'utf8')

    // A dispensa é declarada NO ARQUIVO, junto do motivo — mesmo rito de
    // `auditoria dispensada:`. Hoje não existe nenhuma.
    const dispensada = /escada dispensada:/.test(conteudo)

    expect(
      dispensada || !COMPARACAO_DE_PAPEL_DO_ATOR.test(conteudo),
      `${rota}: compara o papel do ator na mão — use podeGerenciarPapel()`,
    ).toBe(true)
  })
})
