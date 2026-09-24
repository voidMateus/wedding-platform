import { expect, test } from '@playwright/test'
import { criarContaDeTeste, type ContaDeTeste } from './support/conta-de-teste'

/**
 * Orçamento de performance do site público — a porta de CI do ponto 30.
 *
 * O site já passou por uma rodada séria (o `nuxt.config.ts` documenta a remoção
 * do plugin do Supabase das rotas públicas e o corte do prefetch do SDK, 61 kB
 * gzip por convidado). O pedido do relatório não é otimizar de novo: é **manter
 * isso verdadeiro enquanto o site cresce**. Regressão de peso é silenciosa —
 * ninguém abre um PR dizendo "isto acrescenta 80 kB ao bundle do convidado".
 *
 * ### O que entra no orçamento, e o que fica de fora
 *
 * **Peso de JS, sim.** É determinístico: o mesmo build dá o mesmo número em
 * qualquer máquina, então o limite significa a mesma coisa aqui e no runner.
 *
 * **LCP e CLS, não.** O escopo escrito da fase pedia os três, e a divergência é
 * deliberada. LCP depende de CPU e rede do runner, que no GitHub são
 * compartilhados: um limite em cima disso reprova PR por barulho e, na terceira
 * vez, alguém o afrouxa até ele não significar mais nada. CLS herda parte do
 * mesmo problema pelo carregamento de fonte. Os dois continuam sendo medidos à
 * mão, com throttling de verdade, e registrados no `docs/CHANGELOG.md` — que é
 * como o LCP de 2,53s da entrada de 2026-09-16 foi obtido. Um número medido sob
 * condição conhecida vale mais que um gate que ninguém confia.
 *
 * ### Bytes crus, não comprimidos
 *
 * O `node .output/server/index.mjs` não serve nada comprimido (achado de
 * 2026-09-16); a Vercel serve brotli. O número daqui não é o que o convidado
 * baixa — é um **proxy monótono** dele: mais JS cru é sempre mais JS
 * comprimido. Para detectar regressão, que é o trabalho deste arquivo, isso
 * basta, e tem a vantagem de não depender de como o servidor de teste está
 * configurado.
 *
 * ### Subir um limite é decisão, não manutenção
 *
 * Quando este teste reprovar, a pergunta é *por que a rota engordou* — não qual
 * número fazer caber. Se o peso novo for justificado, o limite sobe no mesmo
 * commit que o justifica, com o porquê na mensagem.
 */
test.skip(
  !process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY não configurado — necessário para provisionar a conta de teste.',
)

/**
 * As onze seções ligadas: o pior caso real de uma home.
 *
 * Elas nascem desligadas (opt-in desde 2026-09-14), então um casamento de teste
 * padrão tem só a capa — e medir a capa não descreve o site de ninguém que
 * chegou ao fim do onboarding.
 */
const TODAS_AS_SECOES = [
  'boas-vindas',
  'versiculo',
  'historia',
  'grande-dia',
  'confirmar-presenca',
  'dress-code',
  'manual-convidados',
  'manual-padrinhos',
  'presentes',
  'nossos-momentos',
  'faq',
]

/**
 * Teto de JS por rota pública, em kB crus (carga + prefetch, cache frio).
 *
 * Medidos em 24/09/2026 contra o build de produção: home 699, presentes 699,
 * rsvp 699, galeria 701 — em 80/81 arquivos. Folga de ~12%.
 *
 * **As quatro rotas pesam o mesmo, e isso não é engano de medição**: o Nuxt
 * prefetcha os chunks das outras rotas quando o navegador fica ocioso, então
 * quem abre a home acaba com o material de Presentes, RSVP e Galeria também.
 * É comportamento desejado (torna a navegação seguinte instantânea) e foi o
 * alvo do corte do SDK do Supabase em 2026-09-04 — cortar 61 kB gzip que
 * ninguém ia usar, sem desligar o mecanismo que serve para o resto. Um teto
 * por rota continua fazendo sentido: uma rota que engorde sozinha soma no
 * próprio total.
 */
const ORCAMENTO_JS_KB: Record<string, number> = {
  home: 785,
  presentes: 785,
  rsvp: 785,
  galeria: 790,
}

/**
 * Piso de sanidade.
 *
 * Sem ele o teste passaria com folga numa página que não carregou coisa
 * nenhuma — foi exatamente assim que a régua de truncamento do menu ficou
 * vacuosa por uma rodada inteira (23/09/2026), medindo numa largura em que a
 * coluna nem existia. Um orçamento que não pode falhar não é um orçamento.
 */
const PISO_JS_KB = 150

let conta: ContaDeTeste

test.beforeAll(async () => {
  conta = await criarContaDeTeste()
  await conta.admin
    .from('casamentos')
    .update({ config_tema: { activeSections: TODAS_AS_SECOES } })
    .eq('id', conta.casamentoId)
})

test.afterAll(async () => {
  await conta?.limpar()
})

test('nenhuma rota pública estoura o orçamento de JS', async ({ browser }) => {
  test.setTimeout(180_000)

  const rotas = [
    { nome: 'home', caminho: `/${conta.slug}` },
    { nome: 'presentes', caminho: `/${conta.slug}/presentes` },
    { nome: 'rsvp', caminho: `/${conta.slug}/rsvp` },
    { nome: 'galeria', caminho: `/${conta.slug}/galeria` },
  ]

  const medidos: { nome: string; kb: number; arquivos: number; teto: number }[] = []

  for (const rota of rotas) {
    /**
     * Um contexto NOVO por rota: o orçamento descreve a primeira visita.
     *
     * Reaproveitando a mesma aba, da segunda rota em diante os chunks vêm do
     * cache do navegador e o `responseBodySize` do Playwright volta **-1**
     * (tamanho desconhecido). Somados, davam -24 kB — e foi o piso de sanidade
     * que denunciou, que é exatamente o serviço dele. Cache quente também não
     * é o caso a orçar: o convidado chega pelo WhatsApp, sem nada guardado.
     */
    const contexto = await browser.newContext()
    const page = await contexto.newPage()
    const porArquivo = new Map<string, number>()

    const aoTerminar = async (req: import('@playwright/test').Request) => {
      const url = req.url()
      if (!/\.js(\?|$)/.test(url)) return
      try {
        const bytes = (await req.sizes()).responseBodySize
        // Chave por URL: o mesmo chunk pedido duas vezes pesa uma vez no
        // navegador, e contá-lo duas faria o orçamento descrever um download
        // que não acontece. Tamanho desconhecido (-1) não vira peso negativo.
        if (bytes > 0) porArquivo.set(url, bytes)
      } catch {
        /* requisição abortada — não conta */
      }
    }
    page.on('requestfinished', aoTerminar)

    await page.goto(rota.caminho, { waitUntil: 'networkidle' })
    // O prefetch só dispara quando o navegador fica ocioso, e é justamente ele
    // que o corte do SDK do Supabase resolveu — medir antes dele mediria a
    // metade que nunca foi o problema.
    await page.waitForTimeout(3000)
    page.off('requestfinished', aoTerminar)
    await contexto.close()

    const bytes = [...porArquivo.values()].reduce((s, b) => s + b, 0)
    const kb = Math.round(bytes / 1024)
    const teto = ORCAMENTO_JS_KB[rota.nome] ?? 0
    medidos.push({ nome: rota.nome, kb, arquivos: porArquivo.size, teto })

    console.log(`[orçamento] ${rota.nome}: ${kb} kB em ${porArquivo.size} arquivos (teto ${teto})`)
  }

  for (const m of medidos) {
    expect(
      m.kb,
      `${m.nome} carregou ${m.kb} kB de JS, abaixo do piso de sanidade — a página provavelmente não renderizou, e um orçamento que não pode falhar não vale nada.`,
    ).toBeGreaterThan(PISO_JS_KB)

    expect(
      m.kb,
      `${m.nome} estourou o orçamento: ${m.kb} kB contra ${m.teto} kB. Descubra o que engordou antes de mexer no limite — e, se o peso novo se justifica, suba o teto no mesmo commit que o explica.`,
    ).toBeLessThanOrEqual(m.teto)
  }
})
