import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// Derivado do retorno de `analyze()`, e não importado de `axe-core`: o
// `axe-core` só existe aqui como dependência transitiva do
// `@axe-core/playwright`, e importar tipo de pacote que o `package.json` não
// declara é a forma de o build quebrar no dia em que a árvore for achatada
// diferente.
type ViolacaoAxe = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

/**
 * Varredura de acessibilidade com axe-core, dentro dos testes que a suíte já
 * tem.
 *
 * ## Por que aqui dentro, e não numa spec própria
 *
 * Um spec só de acessibilidade precisaria reencenar o caminho até cada tela —
 * logar, semear, filtrar, abrir o modal — e ia envelhecer separado do teste que
 * já faz exatamente isso. O que o axe precisa é de uma tela num estado real:
 * lista populada, modal aberto, filtro aplicado. A suíte já produz esses
 * estados; a varredura só pega carona no ponto em que eles existem.
 *
 * A consequência boa é que a cobertura acompanha a suíte sem ninguém manter
 * duas listas de telas. A consequência a saber: quem pular o teste pula a
 * varredura junto.
 *
 * ## O recorte: wcag2a + wcag2aa
 *
 * Só as duas tags do WCAG 2.0 nível A e AA — as que o Design System já promete
 * (`docs/DESIGN-SYSTEM.md`). Ficam de fora `best-practice` (opinião do axe, não
 * requisito: ordem de cabeçalho, `region`) e as tags 2.1/2.2, que trariam
 * critérios que a plataforma nunca declarou perseguir. Uma varredura que
 * reprova por regra não acordada vira ruído, e ruído se desliga inteiro.
 *
 * ## O que o axe NÃO vê
 *
 * Ele testa a árvore renderizada, não a experiência: não navega por teclado,
 * não escuta um leitor de tela, não julga se o rótulo faz sentido. Passar aqui
 * é piso, nunca prova de que a tela é acessível.
 */

/** As duas tags que a plataforma persegue — ver o bloco acima. */
const TAGS_WCAG = ['wcag2a', 'wcag2aa'] as const

/**
 * Teto de espera pela entrada das seções do site público antes de medir.
 *
 * A maior transição declarada é de 400ms (`v-motion` nas páginas de `[slug]`),
 * e as seções entram em cascata. Estourar o teto não falha nada: a varredura
 * acontece assim mesmo, e o que estiver mesmo em movimento vira achado — o que
 * é o comportamento certo para uma animação que não termina.
 */
const TETO_DE_ESPERA_POR_ANIMACAO_MS = 2_000

/** Intervalo entre as duas leituras que precisam bater para a tela ser considerada parada. */
const INTERVALO_DE_AMOSTRAGEM_MS = 200

/**
 * Espera as animações de entrada terminarem.
 *
 * Existe por causa de um falso positivo de verdade: o site público faz as
 * seções entrarem com `v-motion` (`opacity: 0 -> 1` em 400ms), e medir no meio
 * do caminho lê o texto a 4% de opacidade. O axe então acusa `color-contrast`
 * de 1.05:1 entre `#f7f4ee` e `#fcfaf4` — duas cores que não existem no Design
 * System, porque são a mistura da cor real com o fundo. Um achado desses
 * envenena a varredura inteira: quem vê um número absurdo aprende a não
 * confiar no resto.
 *
 * O critério é `opacity` INLINE, porque é assim que o @vueuse/motion escreve o
 * valor quadro a quadro. `getAnimations()` não serve: a biblioteca anima por
 * requestAnimationFrame, não pela Web Animations API, e a lista vem vazia.
 * Opacidade parcial declarada por classe do Tailwind fica de fora do critério
 * de propósito — aquilo é estado final, não trânsito.
 *
 * São DUAS condições, e a segunda foi aprendida errando: além de nada estar
 * entre 0 e 1, a leitura precisa ser igual à de 200ms atrás. Só a primeira
 * condição responde "está animando agora?", e devolvia `true` na hora quando a
 * animação ainda **não tinha começado** — foi assim que `/galeria` reportou
 * 1.08:1 depois de a checagem já existir. Exigir estabilidade cobre os dois
 * casos com o mesmo laço.
 */
async function aguardarAnimacoesAssentarem(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const comOpacidade = Array.from(
          document.querySelectorAll<HTMLElement>('[style*="opacity"]'),
        )
        const emTransicao = comOpacidade.some((el) => {
          const opacidade = Number.parseFloat(el.style.opacity)
          return Number.isFinite(opacidade) && opacidade > 0 && opacidade < 1
        })

        // A leitura vive no `window` porque cada avaliação do predicado é um
        // contexto novo — não há fechamento a compartilhar entre duas rodadas.
        const janela = window as unknown as { __a11yLeituraAnterior?: string }
        const leitura = comOpacidade.map((el) => el.style.opacity).join('|')
        const estavel = janela.__a11yLeituraAnterior === leitura && !emTransicao
        janela.__a11yLeituraAnterior = leitura
        return estavel
      },
      undefined,
      { timeout: TETO_DE_ESPERA_POR_ANIMACAO_MS, polling: INTERVALO_DE_AMOSTRAGEM_MS },
    )
    .catch(() => {
      // Silêncio deliberado: ver o comentário do teto acima.
    })
}

export interface OpcoesDeVarredura {
  /**
   * Restringe a varredura a uma parte da tela (seletor CSS) — para quando o
   * estado representativo é um pedaço, não a página: um modal aberto por cima
   * de uma listagem, por exemplo.
   *
   * Vale saber o que isso descarta: com o recorte, um problema do resto da
   * página deixa de ser reportado nessa chamada. Use quando a outra metade da
   * tela já é varrida em outro ponto, não para calar um achado.
   */
  dentroDe?: string
  /**
   * Regras do axe a desligar nesta chamada, com o motivo escrito ao lado no
   * spec. Nunca para esconder achado — só para caso em que a regra não se
   * aplica ao recorte (ex.: `region` num fragmento que não é a página inteira).
   */
  regrasDesligadas?: string[]
  /** Aparece no erro, para dizer QUAL tela falhou quando um spec varre mais de uma. */
  rotulo?: string
}

/** Quantos elementos de uma mesma violação são listados antes de resumir o resto. */
const ALVOS_LISTADOS = 3

function descreverViolacao(violacao: ViolacaoAxe): string {
  const alvos = violacao.nodes
    // Três alvos bastam para identificar o padrão; a lista inteira de uma
    // tabela com 60 linhas enterraria as outras violações no relatório.
    .slice(0, ALVOS_LISTADOS)
    .map((no) => `      ${no.target.join(' ')}`)
    .join('\n')

  const excedente =
    violacao.nodes.length > ALVOS_LISTADOS
      ? `\n      … e mais ${violacao.nodes.length - ALVOS_LISTADOS}`
      : ''

  // O diagnóstico do axe para o PRIMEIRO elemento — em `color-contrast` é ele
  // que traz as duas cores e a razão medida. Sem isto o erro diz que há um
  // problema de contraste e obriga quem lê o CI a reproduzir a tela para
  // descobrir entre quais cores.
  const diagnostico = violacao.nodes[0]?.failureSummary
    ?.split('\n')
    .map((linha) => `      ${linha.trim()}`)
    .join('\n')

  // O seletor do axe é quase sempre um id gerado pelo Vue (`#v-0-0-1-1-0`), que
  // não existe no código-fonte e por isso não se acha por grep. Sem o HTML,
  // localizar um botão sem nome acessível vira caçada à mão pela tela inteira.
  const html = violacao.nodes[0]?.html

  return [
    `  [${violacao.impact ?? 'sem impacto declarado'}] ${violacao.id}: ${violacao.help}`,
    `    ${violacao.helpUrl}`,
    `    ${violacao.nodes.length} elemento(s):`,
    alvos + excedente,
    html ? `    HTML do primeiro:\n      ${html}` : '',
    diagnostico ? `    diagnóstico do primeiro:\n${diagnostico}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * O que o axe examinou e NÃO conseguiu decidir.
 *
 * Isto existe por causa de um ponto cego real, e caro: a home do site público
 * passava limpa com 0 violações, e ao mesmo tempo o Hero punha
 * `--color-text-muted` sobre `--color-surface-muted` a 4,40:1 — em "Vamos nos
 * casar", na data e nos quatro rótulos da contagem regressiva. Medindo com
 * `getComputedStyle` o problema aparecia na hora; o axe não o via porque o Hero
 * tem um GRADIENTE de fundo, e diante disso ele responde "não consigo
 * determinar a cor de fundo" e move o nó para `incomplete`, não para
 * `violations`.
 *
 * Ou seja: sem olhar para `incomplete`, "0 violações" significa "0 violações
 * ENTRE O QUE EU CONSEGUI MEDIR" — e uma varredura que não distingue essas duas
 * frases mente com cara de verde.
 *
 * Não falha o teste, e isso é deliberado: `incomplete` é, na maioria das vezes,
 * conteúdo curto demais ou imagem de fundo, e transformar tudo em vermelho
 * enterraria os achados de verdade. O que ele faz é **deixar rastro** — imprime
 * o que ficou por decidir, para que a lacuna seja escolhida, não herdada.
 */
function relatarIndecisos(
  indecisos: Awaited<ReturnType<AxeBuilder['analyze']>>['incomplete'],
  onde: string,
): void {
  const contraste = indecisos.filter((item) => item.id === 'color-contrast')
  if (contraste.length === 0) return

  const nos = contraste.flatMap((item) => item.nodes)
  const motivos = [...new Set(nos.map((no) => no.any?.[0]?.message ?? 'motivo não declarado'))]

  console.warn(
    [
      `[a11y] ${nos.length} elemento(s) com contraste NÃO VERIFICADO em ${onde}`,
      ...motivos.map((motivo) => `       · ${motivo}`),
      '       (o axe desistiu de medir; confira à mão se a tela for importante)',
    ].join('\n'),
  )
}

/**
 * Falha o teste se a tela (ou o recorte pedido) tiver qualquer violação
 * wcag2a/wcag2aa.
 *
 * A asserção é sobre a LISTA formatada, não sobre a contagem: `expect(0)` diria
 * só "esperava 0, recebeu 3" e mandaria quem lê o CI abrir o navegador para
 * descobrir o quê. Aqui o próprio erro traz regra, impacto, link e os seletores
 * dos elementos.
 *
 * Passar aqui NÃO quer dizer que a tela foi inteiramente medida — ver
 * `relatarIndecisos`.
 */
export async function expectNoAccessibilityViolations(
  page: Page,
  opcoes: OpcoesDeVarredura = {},
): Promise<void> {
  const { dentroDe, regrasDesligadas = [], rotulo } = opcoes

  await aguardarAnimacoesAssentarem(page)

  let construtor = new AxeBuilder({ page }).withTags([...TAGS_WCAG])
  if (dentroDe) construtor = construtor.include(dentroDe)
  if (regrasDesligadas.length > 0) construtor = construtor.disableRules(regrasDesligadas)

  const resultado = await construtor.analyze()

  const onde = [rotulo, dentroDe ? `dentro de "${dentroDe}"` : '', page.url()]
    .filter(Boolean)
    .join(' · ')

  relatarIndecisos(resultado.incomplete, onde)

  expect(
    resultado.violations.map(descreverViolacao),
    `Violações de acessibilidade (wcag2a/wcag2aa) em ${onde}`,
  ).toEqual([])
}
