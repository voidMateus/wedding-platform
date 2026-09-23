import { expect, test } from '@playwright/test'
import { criarContaDeTeste, entrarComo, type ContaDeTeste } from './support/conta-de-teste'
import { esperarHidratacao } from './support/hidratacao'
import { createTestInvite } from '../factories/invite'

/**
 * Registrar um envio com precisão, e dar ritmo à sessão de envio.
 *
 * Registrar era um clique que gravava três coisas por suposição — o tipo, o
 * canal `outro` e a data de agora (rodada de usabilidade de 20/09/2026, ponto
 * 24). A data é a que mais doía: o estágio "enviado" do funil mostra há quanto
 * tempo o convite foi mandado, e é esse número que diz a quem cobrar resposta.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

// Os dois testes dividem a mesma conta e os dois REGISTRAM envios, o que muda
// exatamente o que o outro conta ("faltam N"). Serial aqui não é precaução, é
// a descrição do que eles são.
test.describe.configure({ mode: 'serial' })

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()

  for (const nome of ['Família Andrade', 'Família Bastos', 'Família Corrêa']) {
    await createTestInvite(conta.admin, conta.casamentoId, { nome })
  }
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('registrar com data grava o dia declarado, não o de hoje', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/comunicacoes`)
  await expect(page.getByRole('heading', { level: 1, name: 'Comunicações' })).toBeVisible({
    timeout: 20_000,
  })
  await esperarHidratacao(page)

  await page.getByRole('button', { name: 'Ações de Família Andrade' }).click()
  await page.getByRole('menuitem', { name: 'Registrar com data…' }).click()

  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  // Sem marcar, o registro é de agora — o caso normal continua um clique.
  await modal.getByLabel('Foi em outro dia').check()

  const anteontem = new Date()
  anteontem.setDate(anteontem.getDate() - 2)
  const dia = String(anteontem.getDate())

  await modal.getByRole('button', { name: /Selecione uma data/ }).click()

  // Três armadilhas deste calendário, todas medidas:
  // 1. ele é um popover em PORTAL, então vive fora da árvore do modal —
  //    procurar dentro de `modal` não o acha;
  // 2. o dia é `role="button"`, não `gridcell` (a `<td>` em volta não recebe o
  //    clique);
  // 3. o NOME acessível do dia é a data por extenso ("21 de setembro de
  //    2026"), então casar por `name: '21'` não encontra nada — o número é o
  //    texto do elemento, e é por ele que se procura.
  const calendario = page.locator('div.z-60[data-state="open"]').last()
  await calendario
    .getByRole('button')
    .filter({ hasText: new RegExp(`^${dia}$`) })
    .first()
    .click()

  await modal.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(page.getByText('registrado')).toBeVisible({ timeout: 20_000 })

  // A prova é no banco: a tela mostra "há 2 dias", que depende do relógio de
  // quem lê; a linha guarda o instante declarado.
  const { data: comunicacoes } = await conta.admin
    .from('comunicacoes')
    .select('enviado_em, canal, tipo')
    .eq('casamento_id', conta.casamentoId)

  expect(comunicacoes).toHaveLength(1)
  const registrado = new Date(comunicacoes![0]!.enviado_em)
  expect(registrado.getDate()).toBe(anteontem.getDate())
  // E nunca no futuro, que é o risco que fez a data ficar de fora até hoje.
  expect(registrado.getTime()).toBeLessThan(Date.now())
})

test('a fila anda sozinha e mostra quantos faltam', async ({ page }) => {
  test.setTimeout(120_000)

  const slug = await entrarComo(page, conta)
  await page.goto(`/admin/${slug}/comunicacoes`)
  await expect(page.getByRole('heading', { level: 1, name: 'Comunicações' })).toBeVisible({
    timeout: 20_000,
  })
  await esperarHidratacao(page)

  // Um dos três já foi registrado pelo teste anterior: a fila é derivada de
  // quem FALTA, então ela abre com dois.
  await page.getByRole('button', { name: /Enviar para os que faltam/ }).click()

  const fila = page.getByRole('dialog')
  await expect(fila).toBeVisible()
  await expect(fila.getByText('1 de 2')).toBeVisible()

  await fila.getByRole('button', { name: 'Registrar entregue' }).click()

  // O progresso anda sem ninguém fechar e reabrir — é isso que transforma
  // oitenta convites numa sessão em vez de oitenta buscas na lista.
  await expect(fila.getByText('2 de 2')).toBeVisible({ timeout: 20_000 })

  await fila.getByRole('button', { name: 'Registrar entregue' }).click()
  await expect(fila.getByText('Não falta ninguém')).toBeVisible({ timeout: 20_000 })
})
