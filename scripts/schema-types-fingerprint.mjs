/**
 * Imprime apenas a parte de `app/types/database.types.ts` que descreve o
 * schema: o corpo de `export type Database` e o `export const Constants`.
 *
 * Existe por causa do gate de CI (.github/workflows/ci.yml), que compara o
 * arquivo commitado com o que a CLI gera a partir das migrations. Comparar os
 * arquivos inteiros não funciona: a mesma versão da CLI emite boilerplate
 * diferente conforme a versão do PostgREST que ela detecta no banco —
 * verificado na prática entre o projeto hospedado (`--linked`, PostgREST
 * 14.15) e o stack local do Docker (`--local`):
 *
 * - o hospedado emite um bloco `__InternalSupabase` com `PostgrestVersion`,
 *   o local não emite nada disso;
 * - o hospedado fecha em parênteses as constraints de genérico dos helpers
 *   (`TableName extends (X extends {...} : never) = never`), o local deixa
 *   soltas.
 *
 * Nenhuma das duas diferenças carrega informação de schema. As tabelas,
 * colunas, views, funções e enums vivem inteiramente dentro de
 * `export type Database`, e os valores de enum em `export const Constants` —
 * é exatamente isso que este recorte devolve, e nada além.
 *
 * O que fica de fora, e por quê é seguro: `export type Json` e os helpers
 * `Tables`/`TablesInsert`/`TablesUpdate`/`Enums`/`CompositeTypes` são
 * idênticos para qualquer schema, derivados do tipo `Database` por
 * indexação. Se um dia o gerador mudar a forma deles, o `npm run typecheck`
 * pega — o que este gate precisa garantir é que nenhuma coluna/função/enum
 * do banco esteja faltando ou sobrando no arquivo.
 *
 * Uso: node scripts/schema-types-fingerprint.mjs <caminho>
 */

import { readFileSync } from 'node:fs'

const DATABASE_START = 'export type Database = {'
// Primeira linha depois do tipo `Database` — início do boilerplate de helpers.
const HELPERS_START = 'type DatabaseWithoutInternals'
const CONSTANTS_START = 'export const Constants = {'
// Só carrega `PostgrestVersion` (versão do PostgREST do ambiente que gerou o
// arquivo), e o gerador só o emite contra o projeto hospedado.
const INTERNAL_BLOCK = '__InternalSupabase'

function fail(message) {
  console.error(`schema-types-fingerprint: ${message}`)
  process.exit(2)
}

const path = process.argv[2]
if (!path) fail('informe o caminho do arquivo de tipos.')

const lines = readFileSync(path, 'utf8').replace(/\r/g, '').split('\n')

const indexOfLineStartingWith = (prefix) => lines.findIndex((l) => l.startsWith(prefix))

const databaseStart = indexOfLineStartingWith(DATABASE_START)
const helpersStart = indexOfLineStartingWith(HELPERS_START)
const constantsStart = indexOfLineStartingWith(CONSTANTS_START)

// Marcador ausente significa que o formato do gerador mudou de forma que este
// recorte não entende mais. Falhar alto é o certo: passar batido devolveria um
// fingerprint vazio ou truncado, e o gate viraria um carimbo que nunca reprova.
if (databaseStart === -1) fail(`marcador não encontrado: "${DATABASE_START}"`)
if (helpersStart === -1) fail(`marcador não encontrado: "${HELPERS_START}"`)
if (constantsStart === -1) fail(`marcador não encontrado: "${CONSTANTS_START}"`)
if (helpersStart < databaseStart || constantsStart < helpersStart) {
  fail('marcadores fora da ordem esperada (Database → helpers → Constants).')
}

/** Remove o bloco `__InternalSupabase: { ... }`, contando chaves. */
function stripInternalBlock(block) {
  const start = block.findIndex((l) => l.includes(INTERNAL_BLOCK))
  if (start === -1) return block

  let depth = 0
  let end = start
  for (let i = start; i < block.length; i++) {
    const line = block[i]
    depth += (line.match(/\{/g) ?? []).length
    depth -= (line.match(/\}/g) ?? []).length
    if (depth === 0) {
      end = i
      break
    }
  }
  const rest = block.slice(end + 1)
  // O comentário do gerador fica acima do bloco e tem mais de uma linha —
  // recua enquanto forem comentários, não só uma linha.
  let commentAbove = start
  while (commentAbove > 0 && block[commentAbove - 1]?.trim().startsWith('//')) {
    commentAbove--
  }
  return [...block.slice(0, commentAbove), ...rest]
}

const database = stripInternalBlock(lines.slice(databaseStart, helpersStart))
const constants = lines.slice(constantsStart)

process.stdout.write(
  [...database, ...constants]
    .map((l) => l.trimEnd())
    .filter((l) => l !== '')
    .join('\n') + '\n',
)
