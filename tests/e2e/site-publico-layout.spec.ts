import { expect, test } from '@playwright/test'
import { getServiceRoleClient } from '../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../factories/wedding'

/**
 * Guarda de layout do site público em telas estreitas.
 *
 * Existe porque essa classe de defeito escapou duas vezes seguidas: primeiro a
 * barra de navegação jogou os botões para fora da tela com um nome de casal
 * longo, depois o Hero sangrou para além da borda em 320px. Nos dois casos
 * nenhum teste falhou — os de componente montam o Vue sem layout real, e é
 * justamente a LARGURA calculada que estava errada.
 *
 * O cenário é montado no PIOR CASO, e isso é o que faz o teste valer: nome de
 * casal longo (foi ele que quebrou a barra) e o par tipográfico Cinzel, cujas
 * capitulares são bem mais largas que a Playfair padrão. Numa primeira versão
 * este teste passava com a regressão reintroduzida, justamente porque o
 * casamento de teste nascia com a fonte padrão — um cenário confortável demais
 * para reproduzir o defeito que ele deveria pegar.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar o casamento de teste.',
)

/** Menor largura de celular ainda em uso real, mais dois tamanhos comuns. */
const LARGURAS = [320, 360, 390, 414, 768, 1024, 1280, 1440]

/** Respiro mínimo entre um texto e a borda da tela. */
const MARGEM_MINIMA_PX = 14

test('site público não estoura nem encosta nas bordas, de 320px a 1440px', async ({ page }) => {
  test.setTimeout(120_000)
  const admin = getServiceRoleClient()

  // Nome longo + fonte larga de propósito — ver comentário do arquivo.
  const wedding = await createTestWedding(admin, {
    nomes_noivos: 'Mateus Augusto & Raquel Júlia',
    config_tema: {
      primaryColor: '#72121d',
      secondaryColor: '#836612',
      fontPairId: 'cinzel-inter-montserrat',
      showCountdown: true,
    },
  })

  try {
    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto(`/${wedding.slug}`)

      // As seções aparecem com reveal-on-scroll; sem percorrer a página, boa
      // parte do conteúdo continua invisível e não seria medida.
      await page.evaluate(async () => {
        const passo = window.innerHeight / 2
        for (let y = 0; y < document.body.scrollHeight; y += passo) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 60))
        }
        window.scrollTo(0, 0)
      })

      const medida = await page.evaluate((margemMinima) => {
        const doc = document.documentElement
        const encostados: string[] = []

        for (const el of document.querySelectorAll('body *')) {
          // Só elementos com texto PRÓPRIO: um container full-width vai de
          // borda a borda por definição, e o respiro dele é o padding interno.
          const temTextoProprio = [...el.childNodes].some(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
          )
          if (!temTextoProprio) continue
          // Decorativo (marca d'água do monograma) sangra de propósito.
          if (el.closest('[aria-hidden="true"]')) continue

          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || cs.opacity === '0') continue
          // O link "pular para o conteúdo" fica fora da tela até receber foco.
          if (cs.position === 'absolute' && el.className.toString().includes('sr-only')) continue

          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue

          const folgaEsquerda = r.left
          const folgaDireita = doc.clientWidth - r.right
          if (folgaEsquerda < margemMinima || folgaDireita < margemMinima) {
            const texto = (el.textContent || '').trim().slice(0, 40).replace(/\s+/g, ' ')
            encostados.push(`${el.tagName.toLowerCase()} "${texto}"`)
          }
        }

        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          encostados: [...new Set(encostados)],
        }
      }, MARGEM_MINIMA_PX)

      expect(
        medida.scrollWidth,
        `rolagem horizontal em ${largura}px (a página pede ${medida.scrollWidth}px)`,
      ).toBeLessThanOrEqual(medida.clientWidth)

      expect(
        medida.encostados,
        `texto a menos de ${MARGEM_MINIMA_PX}px da borda em ${largura}px`,
      ).toEqual([])
    }
  } finally {
    await deleteTestWedding(admin, wedding.id)
  }
})
