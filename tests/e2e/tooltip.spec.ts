import { expect, test, type Locator, type Page } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { createTestBudgetCategory, createTestExpense } from '../factories/finance'

/**
 * O tooltip explica — e nunca NOMEIA.
 *
 * Não existia componente de tooltip no design system, então cada caso viraria
 * uma solução local (rodada de usabilidade de 20/09/2026, ponto 12). Primeiro o
 * componente, depois o inventário: com ele, cada caso é uma linha de texto.
 *
 * O teste guarda as duas regras que o `CLAUDE.md` seção 13 impõe e que são
 * fáceis de quebrar sem ninguém ver: o conteúdo entra como DESCRIÇÃO
 * (`aria-describedby`), e o rótulo continua legível sozinho — no celular o
 * tooltip não existe.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/**
 * Passa o ponteiro sobre o gatilho.
 *
 * `hover()` e `mouse.move()` não servem aqui, e isso foi **medido**: o gatilho
 * continuava em `data-state="closed"` depois dos dois, e abria
 * (`delayed-open`) no primeiro `pointermove` disparado à mão. O Reka escuta
 * `pointermove`, e o alvo do evento sintético do Playwright não é o span do
 * gatilho — `pointermove` borbulha para cima, nunca para dentro.
 *
 * Disparar o evento aqui testa o CONTRATO do componente (abre, com o texto
 * certo, ligado por `aria-describedby`), que é o que pode quebrar sem ninguém
 * ver. A entrega do evento pelo navegador não é código nosso.
 */
async function passarOPonteiro(page: Page, alvo: Locator) {
  await alvo.hover()

  // A ESPERA é o ponto, e ela foi medida: o Reka tem uma "grace area" que marca
  // o ponteiro como em trânsito por 300ms depois de ele sair de outro elemento,
  // e nesse intervalo o `pointermove` é ignorado de propósito (é o que impede o
  // balão de piscar quando o cursor só atravessa a tela). O primeiro evento caia
  // dentro dessa janela; o segundo, 400ms depois, abre.
  await page.waitForTimeout(400)

  // Disparado à mão porque o `pointermove` sintético do Playwright não tem como
  // alvo o span do gatilho — e `pointermove` borbulha para cima, nunca para
  // dentro. O que se testa aqui é o contrato do componente, não a entrega do
  // evento pelo navegador.
  await alvo.evaluate((el) =>
    el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' })),
  )
}

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
  const categoria = await createTestBudgetCategory(conta.admin, conta.casamentoId, {
    nome: 'Buffet',
  })
  await createTestExpense(conta.admin, conta.casamentoId, {
    descricao: 'Jantar',
    categoria_id: categoria.id,
    valor_estimado_centavos: 500000,
  })
})

test.afterAll(async () => {
  await conta?.limpar()
})

async function abrirGastos(page: Page): Promise<string> {
  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })
  return slug
}

test('o cabeçalho de coluna explica sem deixar de se nomear', async ({ page }) => {
  test.setTimeout(120_000)

  await abrirGastos(page)

  // O nome da coluna continua sendo o nome: quem não passa o mouse — e no
  // celular ninguém passa — lê "Valor" do mesmo jeito.
  const cabecalho = page.getByRole('columnheader', { name: /Valor/ })
  await expect(cabecalho).toBeVisible()

  // O gatilho é o span com `data-state` — o `<th>` também contém o botão de
  // filtro, que tem um `data-state` próprio e vem depois no DOM.
  await passarOPonteiro(page, cabecalho.locator('[data-state]').first())

  // Pelo TEXTO, e não por `getByRole('tooltip')`: o Reka põe esse papel num
  // elemento visualmente oculto (é o que o leitor de tela lê), e o que aparece
  // na tela é o conteúdo ao lado dele.
  await expect(page.getByText('escolhido pela fase')).toBeVisible({ timeout: 10_000 })
})

test('a explicação dos três números do gasto é descrição, não nome', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await abrirGastos(page)

  const { data: gasto } = await conta.admin
    .from('despesas')
    .select('id')
    .eq('casamento_id', conta.casamentoId)
    .single()

  await page.goto(`/admin/${slug}/financeiro/gastos/${gasto!.id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Jantar' })).toBeVisible({
    timeout: 20_000,
  })

  const rotulo = page.getByText('Contratado', { exact: true }).first()
  await passarOPonteiro(page, rotulo)

  await expect(page.getByText('transforma o gasto em compromisso')).toBeVisible({
    timeout: 10_000,
  })

  // A regra que o CLAUDE.md seção 13 impõe: o balão DESCREVE. Se ele nomeasse,
  // o rótulo dependeria de um id que atravessa duas passagens de render — e sob
  // SSR o nome pode apontar para um elemento que já não existe.
  await expect(rotulo).toHaveAttribute('aria-describedby', /.+/)
  await expect(rotulo).not.toHaveAttribute('aria-labelledby', /.+/)
})
