import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'
import { createTestGift } from '../factories/gift'
import { expectNoAccessibilityViolations } from './utils/a11y'

/**
 * O terceiro fluxo crítico do `ROADMAP.md` — RSVP e login já tinham teste, a
 * reserva de presente não tinha nenhum.
 *
 * Cobre o caminho **gratuito** ("vou comprar e entregar"), de propósito: é o
 * único que se pode percorrer inteiro sem sair da aplicação. O caminho pago
 * termina num checkout hospedado da InfinitePay, e o efeito de negócio só
 * nasce da reverificação servidor-a-servidor (`confirmar_pagamento_presente`)
 * — um teste de navegador que fingisse esse retorno estaria testando a
 * própria encenação, não o produto.
 *
 * O que ele guarda, e que nenhum teste de unidade alcança: o estoque é
 * decrementado **no servidor**, dentro da função Postgres com `FOR UPDATE`
 * (CLAUDE.md seção 10) — nunca a partir de um número que o navegador mandou.
 * Por isso a asserção final é sobre o BANCO, e não só sobre o selo "Esgotado".
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

test('convidado reserva um presente físico gratuito, e o estoque cai no servidor', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, {
    nomes_noivos: 'Ana e Bruno',
    // Sem InfiniteTag: o pagamento online fica indisponível e a única escolha
    // possível é "vou comprar e entregar" — que é justamente o caminho deste
    // teste, sem depender de qual opção aparece primeiro na tela.
    handle_infinitepay: null,
  })

  try {
    const presente = await createTestGift(admin, casamento.id, {
      titulo: 'Jogo de panelas de teste',
      preco_centavos: 45000,
      quantidade_disponivel: 1,
    })

    await page.goto(`/${casamento.slug}/presentes`)

    // O cenário tem UM presente, de propósito: o cartão não tem papel ARIA
    // próprio (é um `UiCard`, uma div), e amarrar o teste à árvore de divs em
    // volta do título o quebraria na primeira mudança de layout. Com um
    // presente só, "o botão Presentear da página" é inequívoco — e o que
    // importa aqui é o fluxo, não a grade.
    await expect(page.getByRole('heading', { name: 'Jogo de panelas de teste' })).toBeVisible()
    await expect(page.getByText('Disponível')).toBeVisible()

    // `toPass` por causa da HIDRATAÇÃO: a página é SSR, então o botão está
    // visível no HTML antes de o Vue assumir. Um clique único pousaria em
    // marcação ainda inerte e não seria repetido depois — o modal nunca
    // abriria, e o teste falharia por timeout sem nada errado no produto.
    await expect(async () => {
      await page.getByRole('button', { name: 'Presentear' }).click()
      await expect(page.getByText('Quem está presenteando?')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })

    // O modal de presentear aberto no primeiro passo: é a tela em que um
    // visitante sem token nenhum digita o próprio nome.
    await expectNoAccessibilityViolations(page, { rotulo: 'Presentes — modal de reserva' })

    // Identificação: o nome é o que aparece para o casal na lista de quem
    // presenteou, e é obrigatório antes de qualquer escolha.
    await page.getByLabel('Seu nome').fill('Tia Cléia')
    await page.getByRole('button', { name: 'Continuar' }).click()

    await page.getByText('Vou comprar e entregar').click()
    await page.getByRole('button', { name: 'Confirmar' }).click()

    // O selo muda porque o servidor decrementou, não porque a tela decidiu.
    await expect(page.getByText('Esgotado')).toBeVisible({ timeout: 15_000 })

    const { data: reservas } = await admin
      .from('reservas_presentes')
      .select('nome_contribuinte, presente_id')
      .eq('presente_id', presente.id)

    expect(reservas).toHaveLength(1)
    expect(reservas?.[0]?.nome_contribuinte).toBe('Tia Cléia')

    const { data: depois } = await admin
      .from('presentes')
      .select('quantidade_disponivel')
      .eq('id', presente.id)
      .single()

    expect(depois?.quantidade_disponivel).toBe(0)

    // Recarregar é o que separa "a tela escondeu o botão" de "o presente saiu
    // da vitrine": um estoque zerado só na memória do navegador voltaria aqui.
    await page.reload()
    await expect(page.getByText('Esgotado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Presentear' })).toHaveCount(0)

    // A vitrine com o presente já esgotado — o selo de estado é o caso em que
    // "a cor diz tudo" costuma escapar.
    await expectNoAccessibilityViolations(page, { rotulo: 'Presentes — vitrine com esgotado' })
  } finally {
    await deleteTestWedding(admin, casamento.id)
  }
})
