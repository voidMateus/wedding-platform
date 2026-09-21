import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'
import { createTestMember, deleteTestMember } from '../factories/member'

/**
 * O link de e-mail loga quem clica nele — inclusive num navegador que nunca
 * pediu link nenhum.
 *
 * Esse "inclusive" é o item inteiro (docs/rodada-usabilidade-2026-09.md, itens
 * A1 e B2): com PKCE, o verificador ficava no navegador que pediu, e o casal que
 * pede no computador e abre o e-mail no celular nunca entrava. Aqui o link é
 * gerado pela API de administração e aberto numa aba limpa — se a sessão nascer
 * assim mesmo, é porque quem verificou foi o servidor.
 *
 * `generateLink` não manda e-mail: ele devolve o mesmo `hashed_token` que o
 * template poria no link. É o que torna este teste possível sem uma caixa de
 * entrada no meio.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o cenário de teste.',
)

test('o link de acesso verificado no servidor loga num navegador que não o pediu', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, { nomes_noivos: 'Link & Acesso' })
  const membro = await createTestMember(admin, casamento.id, 'dono')

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: membro.email,
    })
    if (error || !data.properties?.hashed_token) {
      throw new Error(`Falha ao gerar o link de acesso: ${error?.message}`)
    }

    // A aba está limpa: nenhum verificador, nenhum cookie de auth, nada do
    // pedido — exatamente o celular de quem pediu o link no computador.
    await page.goto(
      `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink&next=/admin/${casamento.slug}`,
    )

    await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}`), { timeout: 20_000 })
    await expect(page.locator('header').first()).toContainText('Link & Acesso')

    // --- e o link é de uso único ---
    //
    // Se ele continuasse valendo, o e-mail viraria uma credencial permanente na
    // caixa de entrada de quem recebeu.
    await page.context().clearCookies()
    await page.goto(
      `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=magiclink&next=/admin/${casamento.slug}`,
    )
    await expect(page).toHaveURL(/\/auth\/callback\?error_code=/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Não foi possível entrar' })).toBeVisible()
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await deleteTestMember(admin, membro.userId)
  }
})
