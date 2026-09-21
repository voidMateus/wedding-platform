import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * O endereço do site, no formulário de criação do painel interno (rodada de
 * usabilidade de 20/09/2026, ponto 1).
 *
 * As duas metades falham em silêncio, e é por isso que o teste é de ponta a
 * ponta: uma sugestão que não dispara deixa o campo vazio — que é exatamente o
 * que ele era antes —, e uma conferência que não chega ao servidor deixa a
 * tela dizendo "livre" sobre um endereço tomado. Nos dois casos não há erro
 * nenhum para acusar; só um operador que descobre o problema no 409, depois de
 * o convite do dono já ter sido pensado.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const TEST_PASSWORD = 'teste-e2e-senha-fake-123!'

const SUFIXO = Date.now().toString().slice(-8)
const NOME_A = `Ana${SUFIXO}`
const NOME_B = `Joao${SUFIXO}`
const ENDERECO_TOMADO = `ana${SUFIXO}-e-joao${SUFIXO}`

test('o endereço do site se sugere pelo nome do casal e diz se está livre', async ({ page }) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  // Um casamento que já existe é o que dá ao teste um endereço OCUPADO real —
  // sem ele, a conferência só teria o caso feliz para responder.
  const casamento = await createTestWedding(admin, { nomes_noivos: 'Endereço Já Tomado' })

  // O endereço que a sugestão produziria para `NOME_A e NOME_B`, tomado de
  // propósito: é o que põe o formulário na situação de sugerir algo ocupado.
  // Os nomes carregam dígitos do relógio para o endereço não coincidir com o de
  // um casamento real do ambiente.
  const homonimo = await createTestWedding(admin, {
    slug: ENDERECO_TOMADO,
    nomes_noivos: `${NOME_A} e ${NOME_B}`,
  })

  const email = `teste-e2e-criar-${Date.now()}@example.com`
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Falha ao criar operador de teste: ${userError?.message}`)
  }
  const operadorId = userData.user.id

  const { error: opError } = await admin
    .from('operadores_plataforma')
    .insert({ usuario_id: operadorId })
  if (opError) {
    throw new Error(`Falha ao vincular operador de teste: ${opError.message}`)
  }

  try {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/plataforma$/, { timeout: 20_000 })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Criar casamento' }).click()

    const endereco = page.getByLabel('Endereço do site')
    await expect(endereco).toBeVisible()

    // A linha de situação é alcançada pelo papél que ela anuncia (`role="status"`),
    // e não pelo texto: é assim que quem usa leitor de tela a recebe, e é o que
    // o teste precisa garantir que continue existindo.
    const situacao = page.getByRole('dialog').getByRole('status')

    // --- sugerir: só o primeiro nome de cada lado ---
    await page.getByLabel('Nome do casal').fill('Lucas Almeida e Maria Almeida')
    await expect(endereco).toHaveValue('lucas-e-maria')

    // --- livre: um endereço que ninguém pode ter tomado ---
    //
    // Não se afirma "livre" sobre a sugestão acima de propósito: `lucas-e-maria`
    // é um endereço plausível, e um casamento real com esse nome faria o teste
    // falhar sem nada estar quebrado.
    const enderecoInedito = `teste-e2e-livre-${Date.now()}`
    await endereco.fill(enderecoInedito)
    await expect(situacao).toContainText('Livre', { timeout: 10_000 })
    await expect(situacao).toContainText(enderecoInedito)

    // --- e nunca sobrescrever o que o operador escreveu ---
    await page.getByLabel('Nome do casal').fill('Lucas Almeida e Maria Silva')
    await expect(endereco).toHaveValue(enderecoInedito)

    // --- ocupado: o veredito chega antes do Criar ---
    await endereco.fill(casamento.slug)
    await expect(situacao).toContainText('Já existe um casamento neste endereço.', {
      timeout: 10_000,
    })

    // Endereço digitado à mão não é trocado por baixo de quem o escreveu — a
    // alternativa é oferecida, e aceitá-la é um clique.
    const oferta = page.getByRole('button', { name: `Usar ${casamento.slug}-2` })
    await expect(oferta).toBeVisible()
    await oferta.click()
    await expect(endereco).toHaveValue(`${casamento.slug}-2`)
    await expect(situacao).toContainText('Livre', { timeout: 10_000 })

    // --- esvaziar o campo devolve a sugestão ---
    await endereco.fill('')
    await page.getByLabel('Nome do casal').fill('Ana & Bruno')
    await expect(endereco).toHaveValue('ana-e-bruno')

    // --- e a sugestão nunca oferece um endereço tomado ---
    //
    // Era o defeito relatado em 21/09/2026: o formulário sugeria `ana-e-joao` a
    // partir do nome do casal e reprovava a própria sugestão na linha seguinte.
    // O segundo casal com o mesmo primeiro nome batia nisso, e "Ana e João" não
    // é um nome raro.
    await endereco.fill('')
    await page.getByLabel('Nome do casal').fill(`${NOME_A} e ${NOME_B}`)
    await expect(endereco).toHaveValue(`${ENDERECO_TOMADO}-2`)
    await expect(situacao).toContainText('Livre', { timeout: 10_000 })
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await deleteTestWedding(admin, homonimo.id)
    await admin.from('operadores_plataforma').delete().eq('usuario_id', operadorId)
    await admin.auth.admin.deleteUser(operadorId)
  }
})
