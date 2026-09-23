import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Toda mutação administrativa registra na trilha de auditoria.
 *
 * A dívida "auditoria completa de ações administrativas" (`ROADMAP.md`) não se
 * paga escrevendo os registros que faltavam — isso é o trabalho de uma tarde, e
 * seis meses depois faltam outros. O que a paga é ESTE teste: ele varre a
 * árvore de rotas e falha quando uma rota nova de escrita nasce sem registro,
 * que é o único momento em que a informação de "quem fez isso" ainda pode ser
 * acrescentada de graça.
 *
 * Verificação estrutural, e não de comportamento: um teste por endpoint
 * precisaria montar o Nitro, o Supabase e uma sessão, e ainda assim não diria
 * nada sobre a rota que ninguém lembrou de cobrir — que é justamente a que
 * importa aqui.
 *
 * Os caminhos de fora ficam de fora de propósito (`CLAUDE.md`, seção 4.2): o
 * convidado, o site público, o webhook e o cron não têm ator administrativo a
 * quem atribuir a ação. O caminho da PLATAFORMA entra: ele não é membro de
 * casamento nenhum, mas tem ator próprio na trilha desde a Fase 5 do Hub. O cron usa `recordSystemAuditLog` onde faz sentido —
 * quando manda e-mail em nome do casal —, mas nunca por requisição.
 */

const RAIZ = join(process.cwd(), 'server', 'api')

/** Sufixos de rota que ESCREVEM. `get` fica de fora: leitura não se audita. */
const MUTACOES = ['.post.ts', '.patch.ts', '.delete.ts', '.put.ts']

/**
 * Caminhos sem ator administrativo. Cada um é uma decisão, não uma isenção de
 * conveniência — acrescentar um aqui deveria doer.
 */
const FORA_DO_CAMINHO_ADMINISTRATIVO = [
  // Convidado e visitante: não há membro autenticado (CLAUDE.md 4.2).
  'public/',
  'rsvp/',
  // Chamados por máquina: o cron audita como `sistema` quando age em nome do
  // casal, e o webhook registra o fato em `eventos_email`.
  'cron/',
  'webhooks/',
]

function arquivosDe(diretorio: string): string[] {
  const encontrados: string[] = []

  for (const entrada of readdirSync(diretorio)) {
    const caminho = join(diretorio, entrada)
    if (statSync(caminho).isDirectory()) {
      encontrados.push(...arquivosDe(caminho))
    } else {
      encontrados.push(caminho)
    }
  }

  return encontrados
}

const rotasDeEscrita = arquivosDe(RAIZ)
  .map((caminho) => relative(RAIZ, caminho).replaceAll('\\', '/'))
  .filter((rota) => MUTACOES.some((sufixo) => rota.endsWith(sufixo)))
  .filter((rota) => !FORA_DO_CAMINHO_ADMINISTRATIVO.some((prefixo) => rota.startsWith(prefixo)))

describe('auditoria de ações administrativas', () => {
  it('encontra as rotas de escrita do painel', () => {
    // Guarda contra o próprio teste passar por vacuidade: uma mudança de
    // estrutura de pastas que zerasse a varredura deixaria a suíte verde sem
    // verificar nada.
    expect(rotasDeEscrita.length).toBeGreaterThan(50)
  })

  it.each(rotasDeEscrita)('%s registra na trilha de auditoria', (rota) => {
    const conteudo = readFileSync(join(RAIZ, rota), 'utf8')

    // A dispensa é declarada NO ARQUIVO, junto do motivo, e não numa lista aqui
    // dentro: a pergunta "por que esta rota não audita?" se responde onde ela
    // aparece. Hoje existe uma só — o arrasto de mesa na planta, que geraria
    // ruído suficiente para esconder o resto da trilha.
    const dispensada = /auditoria dispensada:/.test(conteudo)

    // Há um caso em que o registro é MAIS forte que a chamada em TypeScript, e
    // não menos: quando ele acontece dentro da mesma transação Postgres que a
    // escrita auditada, e não pode se perder entre um commit e o processo
    // morrer. Quem faz assim declara onde, pela frase abaixo — é afirmação
    // verificável, não dispensa (docs/fase5-multievento.md seção 7).
    const emTransacao = /auditoria em transação:/.test(conteudo)

    // Terceira forma, e também afirmação em vez de dispensa: a rota delega o
    // trabalho inteiro a um util compartilhado, e é ELE que audita. Acontece
    // quando duas portas levam ao mesmo ato — contratar a partir da proposta
    // ou a partir do gasto é o mesmo fato, e duplicar a trilha nas duas rotas
    // seria duplicar a chance de elas divergirem.
    //
    // A frase nomeia o destino, e o teste ABRE o destino: uma rota não escapa
    // apontando para um arquivo que não audita, nem para um que não existe.
    const delegada = conteudo.match(/auditoria delegada:\s*(\S+)/)
    let delegadoAudita = false

    if (delegada?.[1]) {
      const destino = join(process.cwd(), delegada[1])
      expect(
        existsSync(destino),
        `${rota}: delega auditoria para ${delegada[1]}, que não existe`,
      ).toBe(true)
      delegadoAudita = /record(System|Platform)?AuditLog\(/.test(readFileSync(destino, 'utf8'))
      expect(delegadoAudita, `${rota}: ${delegada[1]} não registra na trilha`).toBe(true)
    }

    // Os três autores possíveis: membro (recordAuditLog), sistema (o cron) e
    // operador de plataforma (docs/fase5-multievento.md seção 7).
    expect(
      dispensada ||
        emTransacao ||
        delegadoAudita ||
        /record(System|Platform)?AuditLog\(/.test(conteudo),
    ).toBe(true)
  })
})
