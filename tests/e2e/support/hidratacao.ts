import type { Page } from '@playwright/test'

/**
 * Espera o app ficar INTERATIVO, não visível.
 *
 * O painel inteiro é SSR (CLAUDE.md, seção 4.3), então o HTML chega pronto: um
 * `toBeVisible` no título já é verdade enquanto a página ainda é um documento
 * morto, sem nenhum handler ligado. Clicar ali não dá erro — não acontece nada,
 * que é a pior forma de falhar num teste.
 *
 * Foi medido em 23/09/2026, na Fase E: um clique em "Devolver à lista" logo
 * depois do heading não disparava requisição nenhuma, e um `fill('countdown')`
 * na busca chegava ao Vue como "untdown" (os dois primeiros caracteres se
 * perdiam no vão entre o HTML e a hidratação).
 *
 * O sinal é do próprio Vue: `app.mount()` grava `__vue_app__` no contêiner, e o
 * contêiner do Nuxt é `#__nuxt`. É a definição de "montou" — não uma espera
 * cega por tempo, que ficaria curta na máquina lenta e longa na rápida.
 */
export async function esperarHidratacao(page: Page, timeout = 30_000): Promise<void> {
  await page.waitForFunction(
    () => '__vue_app__' in (document.querySelector('#__nuxt') ?? {}),
    null,
    { timeout },
  )
}
