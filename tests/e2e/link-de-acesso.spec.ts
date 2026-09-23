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

    // `$` ancora o fim: sem ele o regex casa com o próprio `?next=/admin/<slug>`
    // da URL do callback, e o teste aprova antes de a navegação acontecer.
    await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}$`), { timeout: 20_000 })
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

/**
 * O formato ANTIGO do link — o que os templates ainda no dashboard produzem.
 *
 * Enquanto os quatro templates não forem colados nos três ambientes, o
 * `{{ .ConfirmationURL }}` devolve a sessão no FRAGMENTO da URL
 * (`#access_token=...`). E o client do navegador recusa esse formato em
 * silêncio: `createBrowserClient` fixa `flowType: 'pkce'`, e o auth-js descarta
 * um retorno implícito nesse caso sem nada chegar à tela.
 *
 * Foi o que quebrou o acesso em 22/09/2026, depois de o pedido do link deixar
 * de usar PKCE. O teste existe porque a falha é muda: nenhum erro no console,
 * nenhum cookie, e a tela culpando o link.
 *
 * `action_link` é exatamente o endereço que o template antigo põe no e-mail.
 */
test('o formato antigo do link, com os tokens no fragmento, também loga', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90_000)
  const admin = getServiceRoleClient()

  const casamento = await createTestWedding(admin, { nomes_noivos: 'Formato & Antigo' })
  const membro = await createTestMember(admin, casamento.id, 'dono')

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: membro.email,
      // Do `baseURL`, nunca `localhost:3000` na mão: o endereço aqui decide para
      // qual servidor o link volta, e a porta do dev server muda por árvore do
      // repo (`scripts/dev-port.mjs`). Fixo, o teste mandaria o link para a
      // árvore ao lado e mediria o app errado.
      options: { redirectTo: `${baseURL}/auth/callback?next=/admin/${casamento.slug}` },
    })
    if (error || !data.properties?.action_link) {
      throw new Error(`Falha ao gerar o link de acesso: ${error?.message}`)
    }

    await page.goto(data.properties.action_link)

    // `$` ancora o fim: sem ele o regex casa com o próprio `?next=/admin/<slug>`
    // da URL do callback, e o teste aprova antes de a navegação acontecer.
    await expect(page).toHaveURL(new RegExp(`/admin/${casamento.slug}$`), { timeout: 20_000 })
    await expect(page.locator('header').first()).toContainText('Formato & Antigo')

    // O token de acesso não fica no histórico do navegador: credencial guardada
    // onde ninguém a apaga é credencial vazando.
    expect(page.url()).not.toContain('access_token')
  } finally {
    await deleteTestWedding(admin, casamento.id)
    await deleteTestMember(admin, membro.userId)
  }
})
