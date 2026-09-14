import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Toda rota do caminho público tem portão de publicação.
 *
 * `casamentos.status_ciclo_vida = 'rascunho'` barra o site público
 * (docs/fase4-onboarding.md seção 8), e o portão é POR CAMINHO porque
 * `service_role` ignora RLS:
 *
 * - quem lê com a **anon key** resolve `casamentos` por slug antes de tocar em
 *   qualquer tabela filha, e a policy `casamentos_select_publico` já devolve
 *   nada para um rascunho;
 * - quem usa **service_role** precisa de `garantirCasamentoPublicado()`,
 *   checado em TypeScript.
 *
 * Sem esta varredura, a garantia acima seria uma afirmação sobre o código de
 * hoje: uma rota pública nova que lesse `etapas_evento` direto por id, ou que
 * usasse `supabaseAdmin` sem o helper, furaria o portão inteiro — em silêncio,
 * porque nada quebra. É o mesmo raciocínio da varredura de auditoria: o que
 * paga a dívida não é escrever as checagens que faltam, é falhar quando a
 * próxima nascer sem.
 */

const RAIZ = join(process.cwd(), 'server', 'api')

/** Os dois caminhos sem autenticação administrativa (CLAUDE.md seção 4.2). */
const CAMINHOS_PUBLICOS = ['public/', 'rsvp/']

function arquivosDe(diretorio: string): string[] {
  const encontrados: string[] = []

  for (const entrada of readdirSync(diretorio)) {
    const caminho = join(diretorio, entrada)
    if (statSync(caminho).isDirectory()) encontrados.push(...arquivosDe(caminho))
    else encontrados.push(caminho)
  }

  return encontrados
}

const rotasPublicas = arquivosDe(RAIZ)
  .map((caminho) => relative(RAIZ, caminho).replaceAll('\\', '/'))
  .filter((rota) => CAMINHOS_PUBLICOS.some((prefixo) => rota.startsWith(prefixo)))

describe('portão de publicação no caminho público', () => {
  it('encontra as rotas públicas', () => {
    // Guarda contra o teste passar por vacuidade: uma mudança de estrutura de
    // pastas que zerasse a varredura deixaria a suíte verde sem verificar nada.
    expect(rotasPublicas.length).toBeGreaterThan(8)
  })

  it.each(rotasPublicas)('%s tem portão', (rota) => {
    const conteudo = readFileSync(join(RAIZ, rota), 'utf8')

    // A dispensa é declarada NO ARQUIVO, junto do motivo — nunca numa lista
    // aqui dentro: a pergunta "por que esta rota não tem portão?" se responde
    // onde ela aparece. Hoje são duas, as duas de pagamento, e pelo mesmo
    // motivo: o portão barra quem está COMEÇANDO algo, nunca quem está
    // terminando o que já começou.
    if (/portão dispensado:/.test(conteudo)) return

    const usaServiceRole = /supabaseAdmin\(/.test(conteudo)

    if (usaServiceRole) {
      // service_role ignora RLS: aqui a policy não protege nada.
      expect(
        /garantirCasamentoPublicado\(/.test(conteudo),
        `${rota} usa service_role e precisa chamar garantirCasamentoPublicado() — ou declarar "portão dispensado:" com o motivo`,
      ).toBe(true)
      return
    }

    // Anon key: a policy cobre, MAS só se a rota passar por `casamentos`. Uma
    // que fosse direto à tabela filha leria o dado de um rascunho.
    expect(
      /from\('casamentos'\)/.test(conteudo),
      `${rota} lê com a anon key sem resolver 'casamentos' antes — a policy casamentos_select_publico não cobre tabela filha consultada direto`,
    ).toBe(true)
  })
})
