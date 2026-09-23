import { expect, test } from '@playwright/test'
import {
  criarContaDeTeste,
  entrarComo,
  semearFinanceiro,
  type ContaDeTeste,
} from './support/conta-de-teste'
import { expectNoAccessibilityViolations } from './utils/a11y'

// O Financeiro contra o Supabase de desenvolvimento real.
//
// O módulo tem DUAS telas e um objeto: Gastos (a lista do gasto, com a ficha
// dele em rota própria) e Pagamentos (o mesmo dinheiro no eixo do tempo).
// Fornecedores e Documentos deixaram de ser tela — viraram seções da ficha.
//
// O que estes testes protegem é a travessia: um gasto planejado não vira
// compromisso, o que é contratado chega a Pagamentos mesmo sem parcela, a ficha
// reúne a história que antes exigia três telas, e a linha da lista mostra UM
// número — o da fase em que o gasto está.
// Auto-suficiente: cria o próprio casal com `service_role` em vez de depender
// de E2E_ADMIN_EMAIL/PASSWORD — variáveis que nunca estiveram no `.env`, e que
// faziam este arquivo inteiro ser PULADO em silêncio (ver
// tests/e2e/support/conta-de-teste.ts).
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
  // Os gastos que estes testes descrevem passam a ser criados POR ELES. Antes
  // viviam no banco de dev — e sumiram junto com a conta que foi limpa.
  await semearFinanceiro(conta)
})

test.afterAll(async () => {
  await conta?.limpar()
})

async function entrar(page: import('@playwright/test').Page): Promise<string> {
  const slug = await entrarComo(page, conta)
  return slug
}

/**
 * O título da tela de planejamento por categoria.
 *
 * Ela se chamava "Categorias" — o nome do objeto — e passou a se chamar pela
 * pergunta que responde (ponto 13 da rodada de usabilidade). O título aparece
 * em tantos passos desta suíte que vale um lugar só.
 */
function tituloDoPlanejamento(page: import('@playwright/test').Page) {
  return page.getByRole('heading', { level: 1, name: 'Onde o dinheiro está indo' })
}

/**
 * Apaga um gasto pela própria linha da categoria.
 *
 * O menu de linha é o caminho desde o ponto 15 da rodada de usabilidade — e
 * gasto só planejado sai sem pergunta, com o desfazer no toast.
 */
async function excluirPelaLinha(page: import('@playwright/test').Page, nome: string) {
  // `toPass` pela corrida de hidratação de sempre: a página vem do servidor e o
  // gatilho do menu existe antes de o Vue anexar o handler — um clique nessa
  // janela não abre nada, e a espera pelo item seguinte estoura o teste inteiro.
  await expect(async () => {
    await page
      .getByRole('button', { name: `Ações de ${nome}` })
      .first()
      .click({ timeout: 3_000 })
    await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await expect(page.getByLabel(`Nome do gasto ${nome}`)).toBeHidden({ timeout: 20_000 })
}

/** Abre a lista de gastos e espera a hidratação. */
async function abrirGastos(page: import('@playwright/test').Page, slug: string) {
  await page.goto(`/admin/${slug}/financeiro`)
  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })
}

/**
 * Abre a faixa "Pagos", que nasce recolhida por ser histórico e não pendência.
 * Quem age numa linha em aberto a vê sair da tela: ela mudou de faixa.
 */
async function abrirPagos(page: import('@playwright/test').Page) {
  const faixa = page.getByRole('button', { name: /^Pagos/ }).first()
  await expect(faixa).toBeVisible({ timeout: 20_000 })
  // `toPass` porque clique que chega antes da hidratação é descartado em
  // silêncio — a mesma corrida que os outros passos desta suíte enfrentam.
  await expect(async () => {
    if ((await faixa.getAttribute('aria-expanded')) === 'false') {
      await faixa.click({ timeout: 3_000 })
    }
    await expect(faixa).toHaveAttribute('aria-expanded', 'true', { timeout: 3_000 })
  }).toPass({ timeout: 30_000 })
}

/** Abre a ficha de um gasto pelo nome dele na lista. */
async function abrirFicha(page: import('@playwright/test').Page, slug: string, gasto: string) {
  await abrirGastos(page, slug)
  await expect(async () => {
    await page.getByRole('button', { name: gasto, exact: true }).first().click({ timeout: 3_000 })
    await expect(page).toHaveURL(/\/financeiro\/gastos\//, { timeout: 3_000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1, name: gasto })).toBeVisible({
    timeout: 20_000,
  })
}

test('o módulo tem um agregado só, e ele mora no topo de Gastos', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await abrirGastos(page, slug)

  // Uma faixa, uma vez. Eram quatro cartões aqui e mais uma régua de cinco
  // números em Pagamentos, com os mesmos valores vistos de outro ângulo.
  await expect(page.getByText('Orçamento do casamento')).toBeVisible({ timeout: 20_000 })
  // Prosa com números dentro, não uma grade de cartões: lê-se de uma vez.
  await expect(page.getByText(/contratados ·/).first()).toBeVisible()

  // A lista cheia é o estado representativo de Gastos: a faixa do agregado, a
  // tabela com um gasto por fase e os controles de filtro/ordenação.
  await abrirGastos(page, slug)
  await expectNoAccessibilityViolations(page, { rotulo: 'Financeiro — Gastos' })

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('Orçamento do casamento')).toHaveCount(0)

  // Pagamentos tem estrutura própria (faixas por vencimento, a de "Pagos"
  // recolhida) — é outra tela, não outra aba da mesma.
  await expectNoAccessibilityViolations(page, { rotulo: 'Financeiro — Pagamentos' })
})

test('cada linha mostra UM número, escolhido pela fase do gasto', async ({ page }) => {
  test.setTimeout(90_000)
  const slug = await entrar(page)

  await abrirGastos(page, slug)

  // "Celebrante" está contratado e nada foi pago: a pergunta pendente dele é
  // quanto ainda sai do bolso, e é só isso que a linha diz. Antes a mesma linha
  // trazia estimado, contratado, pago, teto e desvio — cinco valores para um
  // objeto, e nenhum respondendo "e daí?".
  const linha = page.getByRole('row').filter({ hasText: 'Celebrante' }).first()
  await expect(linha).toBeVisible({ timeout: 20_000 })
  await expect(linha.getByText('falta pagar')).toBeVisible()
  await expect(linha.getByText(/R\$\s?\d/)).toHaveCount(1)
})

test('gasto planejado fica fora de Pagamentos', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await abrirGastos(page, slug)

  const planejado = 'Flores da cerimônia'
  await expect(page.getByRole('row').filter({ hasText: planejado }).first()).toBeVisible({
    timeout: 20_000,
  })

  // Planejar não é se comprometer: só preencher o valor fechado manda o gasto
  // para o eixo do tempo.
  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('row').filter({ hasText: planejado })).toHaveCount(0)
})

test('contratado sem parcela cai na faixa "Sem data", não no esquecimento', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  // A faixa de tempo é o que organiza a tela agora — e "Sem data" é uma faixa
  // de verdade, porque o compromisso existe e falta combinar quando.
  await expect(page.getByText('Contratado, falta combinar quando')).toBeVisible({
    timeout: 20_000,
  })

  // "Celebrante" foi contratado e ninguém definiu como pagar — ele PRECISA
  // estar aqui, senão vira uma conta que só reaparece quando alguém lembra.
  const linha = page.getByRole('row').filter({ hasText: 'Celebrante' }).first()
  await expect(linha).toBeVisible({ timeout: 20_000 })
  await expect(linha.getByRole('button', { name: 'Agendar' })).toBeVisible()
})

test('Pagamentos registra a baixa na própria linha', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  // A baixa e o desfazer acontecem na MESMA linha, identificada pelo
  // vencimento: marcar a primeira em aberto e depois clicar no primeiro
  // "Desfazer" da tela desfazia um pagamento legítimo de outra linha.
  const linha = page
    .getByRole('row')
    .filter({ has: page.getByText('06 de set.') })
    .first()
  await expect(linha).toBeVisible({ timeout: 20_000 })

  // `toPass` porque a página admin renderiza no servidor: clique que chega
  // antes da hidratação é descartado em silêncio.
  await expect(async () => {
    await linha.getByRole('button', { name: 'Marcar pago' }).click({ timeout: 3_000 })
    await expect(page.getByRole('heading', { name: 'Registrar pagamento' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })

  // Com o diálogo aberto: o modal é o caminho em que rótulo, foco e nome
  // acessível mais falham, e ele só existe neste instante do fluxo.
  await expectNoAccessibilityViolations(page, { rotulo: 'Financeiro — registrar pagamento' })

  await page.getByRole('button', { name: 'Confirmar' }).click()

  // `finally` e não sequência: o casamento de desenvolvimento é compartilhado,
  // e uma asserção vermelha no meio deixaria uma parcela paga para sempre —
  // foi exatamente o que aconteceu na primeira execução desta suíte.
  try {
    // Dar baixa MOVE a linha: ela sai da faixa do vencimento e entra em
    // "Pagos". É o que a tela promete ao organizar por tempo.
    await abrirPagos(page)
    await expect(
      page
        .getByRole('row')
        .filter({ has: page.getByText('06 de set.') })
        .first()
        .getByText(/pago em/),
    ).toBeVisible({ timeout: 20_000 })
  } finally {
    await abrirPagos(page)
    const linhaPaga = page
      .getByRole('row')
      .filter({ has: page.getByText('06 de set.') })
      .first()
    await linhaPaga.getByRole('button', { name: /^Ações de/ }).click()
    await page.getByRole('menuitem', { name: 'Desfazer pagamento' }).click()
    await expect(
      page
        .getByRole('row')
        .filter({ has: page.getByText('06 de set.') })
        .first()
        .getByRole('button', { name: 'Marcar pago' }),
    ).toBeVisible({ timeout: 20_000 })
  }
})

test('o lançamento é editável — vencimento, valor e data de pagamento', async ({ page }) => {
  test.setTimeout(150_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/pagamentos`)
  await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
    timeout: 20_000,
  })

  // Pagamento é combinado, remarcado e pago fora da data mais vezes que o
  // contrário: corrigir uma parcela não pode exigir apagá-la e refazer o
  // parcelamento inteiro.
  //
  // A edição sai do MENU da linha: o nome do gasto virou link para a ficha,
  // porque ali a pergunta é outra ("como está o buffet?").
  const abrirEdicao = async () => {
    await abrirPagos(page)
    const linha = page.getByRole('row').filter({ hasText: 'Alianças' }).first()
    await expect(linha).toBeVisible({ timeout: 20_000 })
    await expect(async () => {
      await linha.getByRole('button', { name: /^Ações de/ }).click({ timeout: 3_000 })
      await page.getByRole('menuitem', { name: 'Editar lançamento' }).click({ timeout: 3_000 })
      await expect(page.getByRole('heading', { name: 'Editar lançamento' })).toBeVisible({
        timeout: 3_000,
      })
    }).toPass({ timeout: 30_000 })
  }

  await abrirEdicao()
  const valor = page.getByLabel('Valor', { exact: true })
  const original = await valor.inputValue()

  await valor.fill('R$ 4.321,00')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Editar lançamento' })).toBeHidden({
    timeout: 20_000,
  })
  await expect(
    page.getByRole('row').filter({ hasText: 'Alianças' }).first().getByText('R$ 4.321,00'),
  ).toBeVisible({ timeout: 20_000 })

  // Devolve o valor original — o casamento de desenvolvimento é compartilhado.
  await abrirEdicao()
  await page.getByLabel('Valor', { exact: true }).fill(original)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Editar lançamento' })).toBeHidden({
    timeout: 20_000,
  })
})

test('a ficha do gasto é uma página, e conta a história inteira dele', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  // Clicar no gasto NAVEGA — não abre diálogo. Ler nunca abre modal: modal é
  // para decisão curta, e a ficha é leitura demorada.
  await abrirFicha(page, slug, 'Refrigerantes')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // As camadas da história, que antes exigiam visitar três telas — mais os
  // campos do próprio gasto, editáveis aqui mesmo.
  for (const secao of ['Propostas', 'Contrato', 'Pagamentos', 'Documentos', 'Detalhes']) {
    await expect(page.getByRole('heading', { name: secao })).toBeVisible({ timeout: 20_000 })
  }

  // Duas vezes de propósito: na lista de propostas e no contrato fechado.
  await expect(page.getByText('Atacado do Zé').first()).toBeVisible()

  // E só os documentos DESTE gasto: a listagem vem inteira e o recorte é da
  // tela, porque duas chamadas com a mesma chave de cache compartilhavam a
  // resposta — a ficha do refrigerante mostrava o contrato do buffet.
  await expect(page.getByText('Contrato do buffet')).toHaveCount(0)

  // A ficha reúne cinco seções de naturezas diferentes numa página só — é a
  // tela mais densa do módulo, e a que mais tem a perder numa regressão.
  await expectNoAccessibilityViolations(page, { rotulo: 'Financeiro — ficha do gasto' })
})

test('as propostas do gasto chegam em ordem de preço, com a menor marcada', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await abrirFicha(page, slug, 'Refrigerantes')

  const concorrentes = ['Atacado do Zé', 'Distribuidora Sul', 'Bebidas Express']
  for (const nome of concorrentes) {
    await expect(page.getByText(nome).first()).toBeVisible({ timeout: 20_000 })
  }

  const maisBarato = page.getByRole('listitem').filter({ hasText: 'Atacado do Zé' }).first()
  await expect(maisBarato.getByText('menor')).toBeVisible()

  // Comparar propostas com a mais cara no topo é olhar a lista errada.
  const itens = await page.getByRole('listitem').allInnerTexts()
  const ordem = itens
    .map((texto) => texto.trim())
    .filter((texto) => concorrentes.some((nome) => texto.includes(nome)))
  expect(ordem[0]).toContain('Atacado do Zé')
  expect(ordem[2]).toContain('Bebidas Express')
})

test('filtrar a lista deixa sinal visível, com saída', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  // Houve uma fileira de chips por fase acima da tabela; ela saiu por repetir o
  // filtro da coluna "Situação" e o agregado do topo. O que ela existia para
  // proteger continua valendo: recorte que não se anuncia deixa quem clicou sem
  // saber se clica de novo para desfazer.
  await page.goto(`/admin/${slug}/financeiro?fase=contratado`)
  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })

  await expect(page.getByText('Situação: Contratado')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('row').filter({ hasText: 'Flores da cerimônia' })).toHaveCount(0)

  await expect(async () => {
    await page.getByRole('button', { name: 'Limpar tudo' }).click({ timeout: 3_000 })
    await expect(page.getByText('Situação: Contratado')).toBeHidden({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await expect(
    page.getByRole('row').filter({ hasText: 'Flores da cerimônia' }).first(),
  ).toBeVisible({ timeout: 20_000 })
})

test('o planejamento por categoria soma o que a lista de gastos não soma', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/categorias`)
  await expect(tituloDoPlanejamento(page)).toBeVisible({
    timeout: 20_000,
  })

  // O mesmo desenho de "Andamento por grupo", em Convidados: ponto de cor,
  // barra e o par de valores à direita. A pergunta "onde o dinheiro está
  // indo?" não tem resposta numa lista de linhas individuais.
  await expect(page.getByRole('heading', { name: 'Onde o dinheiro está indo' })).toBeVisible()

  const bebidas = page.getByRole('listitem').filter({ hasText: 'Bebidas' }).first()
  await expect(bebidas).toBeVisible({ timeout: 20_000 })
  // `\s` e não um espaço literal: `formatCentsToBRL` põe espaço NÃO SEPARÁVEL
  // depois do "R$", e o Playwright só normaliza espaço quando o seletor é
  // string — com regex, ele compara o texto cru.
  await expect(bebidas.getByText(/R\$\s1\.620,00 de R\$\s1\.800,00 contratados/)).toBeVisible()

  // Roll-up que não deixa descer é um número sem serventia: a linha abre a
  // categoria, e de dentro dela sai o caminho para a lista já recortada.
  await expect(async () => {
    await page.getByRole('button', { name: /^Bebidas/ }).click({ timeout: 3_000 })
    await expect(page.getByRole('link', { name: 'Ver na lista de gastos' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })

  await page.getByRole('link', { name: 'Ver na lista de gastos' }).click()
  await expect(page).toHaveURL(/categoria=/, { timeout: 20_000 })

  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('row').filter({ hasText: 'Refrigerantes' }).first()).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Celebrante' })).toHaveCount(0)
})

test('a categoria edita os gastos no lugar, sem abrir diálogo', async ({ page }) => {
  test.setTimeout(180_000)
  const nome = `ZGasto ${Date.now().toString().slice(-8)}`
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/categorias`)
  await expect(tituloDoPlanejamento(page)).toBeVisible({
    timeout: 20_000,
  })

  // "Música" de propósito: é a única categoria da demo cujos totais nenhum
  // outro teste desta suíte afirma, então criar um gasto aqui não derruba
  // ninguém rodando em paralelo.
  await expect(async () => {
    await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
    await expect(page.getByRole('button', { name: 'Adicionar gasto' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Adicionar gasto' }).click()
  await page.getByLabel('Nome do gasto novo').fill(nome)
  await page.getByLabel('Estimativa do gasto novo').fill('1.234,00')

  // O ponto inteiro desta tela: planejar não abre modal nenhum.
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Categoria aberta, com os campos de edição no lugar: os controles desta
  // tela não têm rótulo desenhado (a linha inteira é o rótulo), então é
  // exatamente aqui que um `aria-label` faltando passaria despercebido.
  await expectNoAccessibilityViolations(page, {
    rotulo: 'Financeiro — Planejar, com a linha em edição',
  })

  try {
    // Sair da LINHA é o que salva — passar do nome para o valor não salva, para
    // não disparar um refetch no meio da digitação.
    await tituloDoPlanejamento(page).click()
    await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveValue('1.234,00', {
      timeout: 20_000,
    })

    // E persiste: recarrega, reabre a categoria, o valor está lá.
    await page.reload()
    await expect(async () => {
      await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
      await expect(page.getByLabel(`Estimativa de ${nome}`)).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveValue('1.234,00')

    // Editar é o mesmo gesto de criar.
    await page.getByLabel(`Estimativa de ${nome}`).fill('2.000,00')
    await tituloDoPlanejamento(page).click()
    await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveValue('2.000,00', {
      timeout: 20_000,
    })
  } finally {
    // Limpeza pela própria linha — o casamento de demonstração é compartilhado.
    // Era pela ficha, em três telas; o menu de linha encurtou isso para dois
    // cliques (rodada de usabilidade de 20/09/2026, ponto 15).
    await excluirPelaLinha(page, nome)
  }
})

test('Enter e clicar fora criam UM gasto, não dois', async ({ page }) => {
  test.setTimeout(180_000)
  const nome = `ZDuplo ${Date.now().toString().slice(-8)}`
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/categorias`)
  await expect(tituloDoPlanejamento(page)).toBeVisible({
    timeout: 20_000,
  })

  await expect(async () => {
    await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
    await expect(page.getByRole('button', { name: 'Adicionar gasto' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Adicionar gasto' }).click()
  await page.getByLabel('Nome do gasto novo').fill(nome)

  try {
    // O gesto que a inspeção de usabilidade fotografou: Enter e, logo em
    // seguida, o clique fora — sem esperar a linha sumir. A linha salvava nos
    // dois gatilhos e só era limpa depois da resposta do servidor, então o
    // segundo entrava com o mesmo conteúdo e criava o gasto de novo.
    await page.getByLabel('Nome do gasto novo').press('Enter')
    await tituloDoPlanejamento(page).click()

    await expect(page.getByLabel(`Estimativa de ${nome}`)).toBeVisible({ timeout: 20_000 })

    // Um, e só um. `toHaveCount` porque o que se afirma aqui é a contagem —
    // `toBeVisible` passaria com dois.
    await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveCount(1)

    // E continua um depois de recarregar: duas linhas idênticas na tela
    // poderiam ser uma só desenhada duas vezes; no banco, não.
    await page.reload()
    await expect(async () => {
      await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
      await expect(page.getByLabel(`Estimativa de ${nome}`)).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveCount(1)
  } finally {
    await excluirPelaLinha(page, nome)
  }
})

test('a categoria oferece o que costuma faltar, e a sugestão vira gasto', async ({ page }) => {
  test.setTimeout(180_000)
  const item = 'Som e iluminação de pista'
  const slug = await entrar(page)

  await page.goto(`/admin/${slug}/financeiro/categorias`)
  await expect(tituloDoPlanejamento(page)).toBeVisible({
    timeout: 20_000,
  })

  await expect(async () => {
    await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
    await expect(page.getByText('Faltou algo?')).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  const sugestao = page.getByRole('button', { name: new RegExp(item) })
  await expect(sugestao).toBeVisible()
  await sugestao.click()

  // O nome já vem pronto e o cursor cai no VALOR — é o que falta saber.
  await expect(page.getByLabel('Nome do gasto novo')).toHaveValue(item)
  await expect(page.getByLabel('Estimativa do gasto novo')).toBeFocused()

  try {
    await page.getByLabel('Estimativa do gasto novo').fill('3.500,00')
    await tituloDoPlanejamento(page).click()
    await expect(page.getByLabel(`Estimativa de ${item}`)).toHaveValue('3.500,00', {
      timeout: 20_000,
    })

    // E some da fileira: a sugestão não se repete depois de virar gasto — mas
    // as outras continuam lá, porque a lista não se esgota.
    //
    // `exact`, e não um regex solto: o menu da linha se chama "Ações de <gasto>"
    // e conteria o nome do item, fazendo a assertição falhar por casar com o
    // controle que o próprio teste acabou de criar.
    await expect(page.getByRole('button', { name: item, exact: true })).toHaveCount(0)
    await expect(page.getByText('Faltou algo?')).toBeVisible()
  } finally {
    await excluirPelaLinha(page, item)
  }
})

test('contratar com entrada gera o sinal e o saldo, não parcelas iguais', async ({ page }) => {
  test.setTimeout(240_000)
  const nome = `ZEntrada ${Date.now().toString().slice(-8)}`
  const slug = await entrar(page)

  // Um gasto criado aqui mesmo: contratar mexe no valor fechado e nas parcelas,
  // e desfazer isso pela UI não existe — então o alvo tem que ser descartável.
  await page.goto(`/admin/${slug}/financeiro/categorias`)
  await expect(tituloDoPlanejamento(page)).toBeVisible({
    timeout: 20_000,
  })
  await expect(async () => {
    await page.getByRole('button', { name: /^Música/ }).click({ timeout: 3_000 })
    await expect(page.getByRole('button', { name: 'Adicionar gasto' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Adicionar gasto' }).click()
  await page.getByLabel('Nome do gasto novo').fill(nome)
  await page.getByLabel('Estimativa do gasto novo').fill('10.000,00')
  await tituloDoPlanejamento(page).click()
  await expect(page.getByLabel(`Estimativa de ${nome}`)).toHaveValue('10.000,00', {
    timeout: 20_000,
  })

  try {
    await abrirGastos(page, slug)
    const linha = page.getByRole('row').filter({ hasText: nome }).first()
    await expect(linha).toBeVisible({ timeout: 20_000 })

    await expect(async () => {
      await linha.getByRole('button', { name: /^Ações de/ }).click({ timeout: 3_000 })
      await page
        .getByRole('menuitem', { name: 'Registrar valor fechado' })
        .click({ timeout: 3_000 })
      await expect(page.getByLabel('Valor fechado')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 30_000 })

    // Com quem fechou — obrigatório desde o item C5: contrato sem contraparte
    // era o buraco do ponto 17. O nome é novo, então o fornecedor nasce junto.
    await page.getByLabel('Com quem vocês fecharam?').fill(`Banda ${nome}`)

    // "Dei 10% para segurar a data, o resto pago numa data só."
    await page.getByLabel('Valor fechado').fill('10.000,00')
    await page.getByLabel('Teve entrada (sinal)').check()
    await page.getByRole('button', { name: '10%', exact: true }).click()
    await expect(page.getByLabel('Valor da entrada')).toHaveValue('1.000,00')

    // `UiSelect` é um combobox da Reka, não um `<select>` nativo: abre e escolhe.
    await page.getByLabel('Como vai pagar o restante').click()
    await page.getByRole('option', { name: 'Numa data só' }).click()

    // A prévia sai do MESMO gerador do servidor — se ela mentir aqui, mente lá.
    await expect(page.getByText(/Vai virar: entrada de R\$\s1\.000,00/)).toBeVisible()
    await expect(page.getByText(/R\$\s9\.000,00/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar contratação' }).click()

    // Espera o diálogo fechar antes de navegar: sair da página com a requisição
    // em voo a aborta, e o teste acusaria o produto de um defeito que era dele
    // mesmo. (Eram DUAS requisições até o item A4 — grava o valor, depois cria
    // as parcelas; hoje é uma só, e a espera continua valendo.)
    await expect(page.getByRole('button', { name: 'Confirmar contratação' })).toBeHidden({
      timeout: 20_000,
    })

    await page.goto(`/admin/${slug}/financeiro/pagamentos`)
    await expect(page.getByRole('heading', { level: 1, name: 'Pagamentos' })).toBeVisible({
      timeout: 20_000,
    })

    const linhas = page.getByRole('row').filter({ hasText: nome })
    await expect(linhas).toHaveCount(2, { timeout: 20_000 })
    await expect(linhas.filter({ hasText: 'R$ 1.000,00' })).toHaveCount(1)
    await expect(linhas.filter({ hasText: 'R$ 9.000,00' })).toHaveCount(1)
  } finally {
    // `abrirFicha` e não um clique cru: ele já trata a corrida com a hidratação.
    // Limpeza que falha aqui mascararia o erro do corpo do teste.
    await abrirFicha(page, slug, nome)
    // "Excluir gasto" saiu do rodapé do formulário de Detalhes e foi para o menu
    // do cabeçalho, junto das outras ações destrutivas do painel (ponto 19).
    await page.getByRole('button', { name: 'Ações do gasto' }).click()
    await page.getByRole('menuitem', { name: 'Excluir gasto' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
      timeout: 20_000,
    })
  }
})

test('a ordenação da coluna ordena de verdade', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  // O menu de ordenação já existiu em três telas sem mexer uma linha de lugar:
  // as páginas filtravam à mão e nunca ordenavam. Filtro que não filtra é pior
  // que filtro ausente, porque quem usa confia nele.
  await page.goto(`/admin/${slug}/financeiro?ordenar=valor&direcao=desc`)
  await expect(page.getByRole('heading', { level: 1, name: 'Gastos' })).toBeVisible({
    timeout: 20_000,
  })

  // A coluna "Valor" é a quarta: gasto, categoria, situação, valor.
  const valorDaLinha = async (indice: number) => {
    const texto = await page.getByRole('row').nth(indice).locator('td').nth(3).innerText()
    return Number(texto.replace(/[^\d]/g, ''))
  }

  // nth(0) é o cabeçalho; as duas primeiras linhas de dados vêm depois.
  await expect(async () => {
    const primeiro = await valorDaLinha(1)
    const segundo = await valorDaLinha(2)
    expect(primeiro).toBeGreaterThanOrEqual(segundo)
    expect(primeiro).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })

  await page.goto(`/admin/${slug}/financeiro?ordenar=valor&direcao=asc`)
  await expect(async () => {
    const primeiro = await valorDaLinha(1)
    const segundo = await valorDaLinha(2)
    expect(primeiro).toBeLessThanOrEqual(segundo)
  }).toPass({ timeout: 20_000 })
})

test('arquivar fornecedor contratado explica o vínculo e oferece a saída', async ({ page }) => {
  test.setTimeout(120_000)
  const slug = await entrar(page)

  await abrirFicha(page, slug, 'Buffet — 120 pessoas')

  // O servidor recusa arquivar fornecedor ligado a um gasto. A tela precisa
  // dizer isso ANTES do botão e oferecer como resolver — antes mandava tentar
  // para então mostrar o erro num aviso atrás da própria janela.
  await expect(async () => {
    await page.getByRole('button', { name: 'Arquivar Buffet Recanto' }).click({ timeout: 3_000 })
    await expect(page.getByRole('heading', { name: 'Arquivar fornecedor' })).toBeVisible({
      timeout: 3_000,
    })
  }).toPass({ timeout: 30_000 })

  const modal = page.getByRole('dialog')
  await expect(modal.getByText(/é o contratado de 1 gasto/)).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Desvincular e arquivar' })).toBeVisible()

  // Cancela: o teste prova o caminho, não gasta o dado.
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('heading', { name: 'Arquivar fornecedor' })).toBeHidden()
})

test('proposta arquivada tem caminho de volta, na própria ficha', async ({ page }) => {
  test.setTimeout(180_000)
  const nome = `ZForn ${Date.now().toString().slice(-8)}`
  const slug = await entrar(page)

  await abrirFicha(page, slug, 'Flores da cerimônia')

  await expect(async () => {
    await page.getByRole('button', { name: 'Adicionar fornecedor' }).click({ timeout: 3_000 })
    await expect(page.getByLabel('Nome', { exact: true })).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 30_000 })

  await page.getByLabel('Nome', { exact: true }).fill(nome)
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar fornecedor' }).click()

  const item = page.getByRole('listitem').filter({ hasText: nome }).first()
  await expect(item).toBeVisible({ timeout: 20_000 })

  const arquivar = async () => {
    await page.getByRole('button', { name: `Arquivar ${nome}` }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect(page.getByRole('listitem').filter({ hasText: nome })).toHaveCount(0, {
      timeout: 20_000,
    })
  }

  // Tudo depois da criação vive num `try`: o fornecedor criado aqui fica
  // pendurado num gasto REAL do casamento de demonstração, e uma asserção
  // vermelha no meio o deixaria lá para sempre. Foi assim que catorze "ZForn"
  // se acumularam antes de alguém olhar.
  try {
    // Sem gasto contratado apontando para ele, arquivar é direto.
    await arquivar()

    // O caminho de volta: a gaveta de arquivados, com Restaurar.
    //
    // `arquivada(s)?` e não `arquivadas?`: o `?` vale só para o caractere
    // anterior, então `arquivadas?` nunca casaria com o singular — o regex que
    // já rendeu uma falha que parecia intermitência.
    const arquivadas = page.getByRole('button', { name: /proposta(s)? arquivada(s)?$/ })
    await expect(arquivadas).toBeVisible({ timeout: 20_000 })
    await arquivadas.click()

    const itemArquivado = page.getByRole('listitem').filter({ hasText: nome }).last()
    await expect(itemArquivado).toBeVisible({ timeout: 10_000 })
    await itemArquivado.getByRole('button', { name: 'Restaurar' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: nome }).first()).toBeVisible({
      timeout: 20_000,
    })
  } finally {
    if ((await page.getByRole('button', { name: `Arquivar ${nome}` }).count()) > 0) {
      await arquivar()
    }
  }
})
