import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'
import { createTestMember, deleteTestMember } from '../factories/member'

/**
 * O ciclo da senha: link no e-mail → tela de definir → entrar com ela.
 *
 * Nenhuma das três partes existia (rodada de usabilidade de 20/09/2026, ponto
 * 4): não havia "esqueci minha senha", não havia tela de definir, e o convite
 * não levava a lugar nenhum. O teste fecha o ciclo inteiro porque é ele que
 * importa — uma tela de senha que salva e um login que continua recusando a
 * senha nova são dois sucessos que somam zero.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

const SENHA_NOVA = 'teste-e2e-senha-nova-456!'

test('o link de recuperação leva à tela de senha, e a senha nova passa a valer', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, { nomes_noivos: 'Senha & Acesso' })
  const membro = await createTestMember(admin, casamento.id, 'dono')

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: membro.email,
    })
    if (error || !data.properties?.hashed_token) {
      throw new Error(`Falha ao gerar o link de recuperação: ${error?.message}`)
    }

    // O tipo `recovery` é o que manda para a tela de senha: nenhum `next` é
    // passado, e é o servidor que decide o destino a partir dele.
    await page.goto(`/auth/confirmar?token_hash=${data.properties.hashed_token}&type=recovery`)

    await expect(page).toHaveURL(/\/auth\/senha/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Escolher uma nova senha' })).toBeVisible()

    // `exact` porque "Repita a nova senha" contém o rótulo do primeiro campo.
    await page.getByLabel('Nova senha', { exact: true }).fill(SENHA_NOVA)
    await page.getByLabel('Repita a nova senha').fill(SENHA_NOVA)
    await page.getByRole('button', { name: 'Salvar senha' }).click()

    await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}`), { timeout: 20_000 })

    // --- e a senha nova é a que passa a valer ---
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('E-mail').fill(membro.email)
    await page.getByLabel('Senha').fill(SENHA_NOVA)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}`), { timeout: 20_000 })

    // --- e trocar a senha fica a um clique do bloco de identidade ---
    //
    // Antes ela estava a três: abrir Configurações, achar o assunto, achar a
    // seção. Conta se procura no canto superior direito, em qualquer sistema.
    await page.getByRole('button', { name: /^Conta:/ }).click()
    await page.getByRole('menuitem', { name: 'Senha' }).click()

    await expect(page).toHaveURL(/configuracoes\?secao=senha/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Senha', exact: true })).toBeVisible()
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await deleteTestMember(admin, membro.userId)
  }
})

test('pedir redefinição responde igual para e-mail com e sem conta', async ({ request }) => {
  // A diferença transformaria a tela de login num verificador de quem é
  // cliente da plataforma — dá para varrer uma lista de e-mails e ficar
  // sabendo quem tem casamento aqui.
  const semConta = await request.post('/api/auth/password-reset', {
    data: { email: `teste-e2e-sem-conta-${Date.now()}@example.com` },
  })

  expect(semConta.status()).toBe(200)
  expect(await semConta.json()).toEqual({ enviado: true })
})

/**
 * A recuperação no formato ANTIGO do link cai na mesma ponte.
 *
 * `/auth/senha` é a outra tela que recebe os tokens no fragmento enquanto os
 * templates não forem trocados, e ela falharia do mesmo jeito mudo do callback:
 * esperando uma sessão que o client recusou sem avisar, e terminando em "este
 * link expirou" sobre um link recém-gerado.
 */
test('a recuperação no formato antigo do link abre a tela de senha com sessão', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, { nomes_noivos: 'Recuperar & Antigo' })
  const membro = await createTestMember(admin, casamento.id, 'dono')

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: membro.email,
      options: { redirectTo: 'http://localhost:3000/auth/senha' },
    })
    if (error || !data.properties?.action_link) {
      throw new Error(`Falha ao gerar o link de recuperação: ${error?.message}`)
    }

    await page.goto(data.properties.action_link)

    await expect(page).toHaveURL(/\/auth\/senha$/, { timeout: 20_000 })
    // O formulário, e não o aviso de link inválido: é a sessão que decide qual
    // dos dois a tela mostra.
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible({ timeout: 20_000 })
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await deleteTestMember(admin, membro.userId)
  }
})
