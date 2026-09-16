import { chromium, type Browser, type Page } from '@playwright/test'
import { resolveDevPort } from '../../scripts/dev-port.mjs'
import { criarContaDeTeste } from './support/conta-de-teste'

/**
 * Compila o app inteiro uma vez, em série, antes de o relógio de qualquer teste
 * começar.
 *
 * O `webServer` do Playwright espera o dev server responder em `/` — e só. Mas
 * o Vite compila sob demanda, e o custo se divide em duas partes que precisam
 * das duas metades do aquecimento:
 *
 * - o **módulo da rota**, que só é pedido quando o roteador resolve aquela
 *   rota. Rota atrás de middleware de sessão nunca chega a ser resolvida sem
 *   login, então aquecer `/admin/...` deslogado não compila nada;
 * - o **bundle do cliente e a folha do Tailwind**, que só são pedidos por um
 *   NAVEGADOR. Um `fetch` recebe o HTML do SSR e para aí.
 *
 * A primeira versão deste arquivo fazia `fetch` em `/login` e `/admin`, e por
 * isso só resolvia metade do problema — a suíte seguiu falhando no CI com três
 * máscaras da mesma corrida: a URL parada em `/login`, o `net::ERR_ABORTED` de
 * uma navegação pedida sobre outra em voo, e uma violação de strict mode em
 * `getByRole('checkbox')`, que resolveu para DOIS elementos porque a linha de
 * desktop e a do celular só se excluem por CSS — e a folha ainda não tinha
 * ficado pronta, então as duas estavam na árvore de acessibilidade.
 *
 * Daí a conta de custo ser favorável mesmo parecendo cara: são ~15 navegações
 * pagas uma vez, contra `retries: 2` reexecutando a suíte inteira a cada teste
 * que tropeça no cold start.
 */

/**
 * As FAMÍLIAS de rota da suíte, com um representante de cada.
 *
 * Não é a lista completa de telas de propósito: rotas irmãs compartilham quase
 * tudo (layout, componentes de `ui/`, o CSS), então a segunda de uma família
 * custa pouco. O que precisa estar aqui é cada família que algum spec abre.
 */
function rotasDoPainel(slug: string): string[] {
  return [
    '/admin',
    `/admin/${slug}`,
    `/admin/${slug}/comecar`,
    `/admin/${slug}/convidados`,
    `/admin/${slug}/convidados/lista`,
    `/admin/${slug}/convites`,
    `/admin/${slug}/mesas`,
    `/admin/${slug}/financeiro`,
    `/admin/${slug}/financeiro/pagamentos`,
    `/admin/${slug}/financeiro/categorias`,
    `/admin/${slug}/planejamento`,
  ]
}

function rotasPublicas(slug: string): string[] {
  return ['/', `/${slug}`, `/${slug}/rsvp`, `/${slug}/presentes`]
}

/**
 * Um `goto` de aquecimento nunca falha a suíte.
 *
 * Servidor de pé é o que o `webServer` já garantiu; o que acontece aqui é só
 * compilação, e o teste seguinte dirá a verdade melhor do que uma exceção
 * lançada de um setup.
 */
async function aquecer(page: Page, rota: string): Promise<void> {
  try {
    await page.goto(rota, { waitUntil: 'networkidle', timeout: 120_000 })
  } catch {
    // segue para a próxima rota
  }
}

export default async function globalSetup() {
  // Mesma guarda dos specs que provisionam cenário: sem service role não há
  // conta para logar, e a suíte inteira já se pula sozinha.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const baseURL = `http://localhost:${resolveDevPort()}`
  const comecou = Date.now()

  const conta = await criarContaDeTeste({ nomes_noivos: 'Aquecimento & Suite' })
  let navegador: Browser | undefined

  try {
    // O mesmo usuário é dono E operador: com um login só, o aquecimento alcança
    // `/admin/**` e `/plataforma/**`. Duas contas não comprariam nada aqui — o
    // que se está compilando é o app, não a autorização.
    await conta.admin.from('operadores_plataforma').insert({ usuario_id: conta.usuarioId })

    navegador = await chromium.launch()
    const page = await navegador.newPage({ baseURL })

    // O primeiro `goto` do processo é o caro: é ele que paga o bundle do
    // cliente e a folha do Tailwind inteira, que todas as outras reaproveitam.
    await aquecer(page, '/login')

    await page.getByLabel('E-mail').fill(conta.email)
    await page.getByLabel('Senha').fill(conta.senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    // Timeout largo de propósito: aqui ainda é o cold start que este arquivo
    // existe para pagar, e é o único lugar da rodada em que ele é esperado.
    await page.waitForURL(/\/admin\/[^/]+$/, { timeout: 120_000 })

    for (const rota of rotasDoPainel(conta.slug)) await aquecer(page, rota)
    for (const rota of ['/plataforma', `/plataforma/${conta.casamentoId}`])
      await aquecer(page, rota)
    for (const rota of rotasPublicas(conta.slug)) await aquecer(page, rota)
  } finally {
    await navegador?.close()
    await conta.limpar()
  }

  console.log(`[e2e] aquecimento concluído em ${Math.round((Date.now() - comecou) / 1000)}s`)
}
