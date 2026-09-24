import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Toda tabela do schema public tem GRANT declarado em migration.
 *
 * A partir de 30/10/2026 o Supabase deixa de conceder acesso da Data API às
 * tabelas novas de public — inclusive as criadas por migration. Tabela sem
 * GRANT nasce inalcançável até para `service_role` (42501), e a falha só
 * aparece em dev/prod: o stack local do CI é montado pelas mesmas migrations,
 * mas uma rota que nunca foi exercitada por teste de integração passa verde.
 *
 * `20260924120001_grants_explicitos_de_tabela.sql` declarou o que as tabelas
 * da época herdavam. Daí em diante, o GRANT vive na migration que cria a
 * tabela (CLAUDE.md seção 10) — e é isso que esta varredura cobra.
 */

const RAIZ = join(process.cwd(), 'supabase', 'migrations')
const MIGRATION_DE_RECUPERACAO = '20260924120001_grants_explicitos_de_tabela.sql'
const TIPOS = join(process.cwd(), 'app', 'types', 'database.types.ts')

const migrations = readdirSync(RAIZ)
  .filter((arquivo) => arquivo.endsWith('.sql'))
  .sort()
  .map((arquivo) => ({ arquivo, sql: semComentarios(readFileSync(join(RAIZ, arquivo), 'utf8')) }))

function semComentarios(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

function semPrefixoDeSchema(nome: string): string {
  return nome.replace(/^public\./, '')
}

function tabelasCriadas(sql: string): string[] {
  return [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi)].map((m) =>
    semPrefixoDeSchema(m[1]!.toLowerCase()),
  )
}

/** Tabelas que recebem GRANT a service_role no arquivo (lista `on table a, b to ...`). */
function tabelasComGrantAoServiceRole(sql: string): Set<string> {
  const comGrant = new Set<string>()
  for (const m of sql.matchAll(
    /grant\s+[\w\s,]+?\s+on\s+(?:table\s+)?([\w.,\s]+?)\s+to\s+([\w\s,]+?);/gi,
  )) {
    if (!/\bservice_role\b/i.test(m[2]!)) continue
    for (const nome of m[1]!.split(',')) comGrant.add(semPrefixoDeSchema(nome.trim().toLowerCase()))
  }
  return comGrant
}

/** As tabelas de public como estão HOJE (depois de toda renomeação), pelo arquivo gerado. */
function tabelasAtuais(): string[] {
  const tipos = readFileSync(TIPOS, 'utf8').replace(/\r/g, '')
  const publico = tipos.slice(tipos.indexOf('\n  public: {'))
  const secao = publico.slice(publico.indexOf('Tables: {'), publico.indexOf('Views: {'))
  return [...secao.matchAll(/^ {6}([a-z_]+): \{$/gm)].map((m) => m[1]!)
}

const posRecuperacao = migrations.filter((m) => m.arquivo >= MIGRATION_DE_RECUPERACAO)
const atuais = tabelasAtuais()

describe('GRANT explícito de tabela', () => {
  it('encontra a migration de recuperação e as tabelas atuais', () => {
    // Guarda contra passar por vacuidade: um rename do arquivo ou uma mudança
    // de formato do gerador zeraria as duas listas sem nada acusar.
    expect(posRecuperacao[0]?.arquivo).toBe(MIGRATION_DE_RECUPERACAO)
    expect(atuais.length).toBeGreaterThan(30)
  })

  it.each(posRecuperacao.filter((m) => tabelasCriadas(m.sql).length > 0))(
    '$arquivo concede GRANT às tabelas que cria',
    ({ arquivo, sql }) => {
      const comGrant = tabelasComGrantAoServiceRole(sql)
      const semGrant = tabelasCriadas(sql).filter((tabela) => !comGrant.has(tabela))

      expect(
        semGrant,
        `${arquivo} cria ${semGrant.join(', ')} sem GRANT — a partir de 30/10/2026 a tabela nasce inalcançável pela Data API. ` +
          'Conceder na mesma migration: service_role sempre, authenticated se o painel lê/escreve, anon só com policy de leitura pública.',
      ).toEqual([])
    },
  )

  it.each(atuais)('%s tem GRANT declarado em alguma migration', (tabela) => {
    // Cobre o que a verificação por arquivo não vê: uma tabela renomeada depois
    // da recuperação, ou uma removida da lista dela por engano.
    const declarada = migrations.some((m) => tabelasComGrantAoServiceRole(m.sql).has(tabela))
    expect(declarada, `${tabela} não tem GRANT a service_role em migration nenhuma`).toBe(true)
  })
})
