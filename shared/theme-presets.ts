// Catálogo de temas prontos e pares tipográficos (CLAUDE.md, seção 22.1/22.3
// — Fase Visual). Presets são um atalho: escolher um preenche
// primaryColor/secondaryColor/fontPairId de uma vez, mas cada peça continua
// editável isoladamente depois (a fonte é uma escolha independente da cor,
// não só embutida dentro do preset — ver FontPairPicker.vue).
//
// Toda cor de todo preset é coberta pelo teste de integridade em
// tests/unit/theme-presets.spec.ts, que garante checkColorContrast(...).
// meetsMinimum para as duas cores de cada entrada — nenhum preset pode
// repetir o problema documentado com o #a8785c original do CLAUDE.md.

export interface ThemePreset {
  id: string
  label: string
  primaryColor: string
  secondaryColor: string
  fontPairId: string
  /**
   * Cor de ornamento (filetes, "&", divisores, monograma) — opcional. Sem
   * ela, o ornamento herda a secundária, que é como o site sempre se
   * comportou (ver --color-ornament em main.css). Só existe nos presets em
   * que o dourado é parte da identidade, não um acessório.
   */
  ornamentColor?: string
  /**
   * Cor dos títulos do site (`--color-heading`) — os nomes do casal no Hero e
   * os cabeçalhos de seção.
   *
   * Existe desde 2026-09-14, e é metade do motivo de os presets antigos
   * parecerem iguais: sem ela, o maior elemento da página sai sempre do mesmo
   * `--color-text` em todos os presets, e a paleta só pinta o botão de CTA e o
   * ornamento. Validada como as demais (≥4.5:1 sobre branco) — diferente do
   * ornamento, título É texto de conteúdo.
   */
  titleColor?: string
}

export interface FontPair {
  id: string
  label: string
  /** Títulos do site público — vira --font-display. É a única família do par que muda a página. */
  displayFontFamily: string
  /**
   * ATENÇÃO: este campo **não chega ao site**. `--font-sans` é fixa da
   * plataforma por decisão de arquitetura (ver DESIGN-SYSTEM.md 3.1: corpo de
   * texto e admin nunca variam por casamento), `useWeddingTheme` não o emite e
   * o FontPairPicker mostra a prévia só em `displayFontFamily`. Hoje ele é
   * metadado de rótulo — todo par existente declara a fonte que o corpo
   * *teria* e o corpo continua em Inter.
   *
   * Consequência prática para quem for acrescentar um par: um par cujo
   * atrativo seja o corpo (ex.: "Cinzel + Cormorant") entrega exatamente o
   * mesmo resultado de um "Cinzel + Inter" e só acrescenta um rótulo que
   * promete o que não acontece. Foi por isso que a Fase Rebrand do Convite
   * removeu o par que tinha criado e apontou o preset para o já existente.
   * Enquanto `--font-sans` for fixa, par novo só se justifica por uma
   * `displayFontFamily` (ou `buttonFontFamily`) diferente.
   */
  bodyFontFamily: string
  /** Fonte de botões/CTAs (--font-button) — opcional; sem ela, botões herdam --font-sans. */
  buttonFontFamily?: string
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: 'playfair-inter',
    label: 'Playfair Display + Inter',
    displayFontFamily: 'Playfair Display',
    bodyFontFamily: 'Inter',
  },
  {
    id: 'cormorant-nunito',
    label: 'Cormorant Garamond + Nunito Sans',
    displayFontFamily: 'Cormorant Garamond',
    bodyFontFamily: 'Nunito Sans',
  },
  {
    id: 'dmserif-dmsans',
    label: 'DM Serif Display + DM Sans',
    displayFontFamily: 'DM Serif Display',
    bodyFontFamily: 'DM Sans',
  },
  {
    id: 'abril-worksans',
    label: 'Abril Fatface + Work Sans',
    displayFontFamily: 'Abril Fatface',
    bodyFontFamily: 'Work Sans',
  },
  {
    id: 'librebaskerville-karla',
    label: 'Libre Baskerville + Karla',
    displayFontFamily: 'Libre Baskerville',
    bodyFontFamily: 'Karla',
  },
  {
    id: 'cinzel-inter-montserrat',
    label: 'Cinzel + Inter (botões em Montserrat)',
    displayFontFamily: 'Cinzel',
    bodyFontFamily: 'Inter',
    buttonFontFamily: 'Montserrat',
  },
  {
    id: 'cormorant-inter',
    label: 'Cormorant Garamond + Inter',
    displayFontFamily: 'Cormorant Garamond',
    bodyFontFamily: 'Inter',
  },
]

/**
 * As paletas que a plataforma oferece — uma por família de cor.
 *
 * ## Por que este catálogo foi refeito em 2026-09-14
 *
 * O anterior tinha oito presets e **seis primárias num arco de 40°** (H=343 a
 * H=23: todo o vermelho-vinho-marrom), com quatro delas dividindo o MESMO
 * dourado de secundária. Na prática eram cinco variações de "vinho + dourado"
 * separadas só pela fonte — e escolher entre elas era escolher no escuro.
 * Borgonha Editorial e Convite de Luxo, em particular, eram quase a mesma cor.
 *
 * Agora cada preset ocupa uma faixa própria do círculo, e os dois pares que
 * ficaram vizinhos são vizinhos só em matiz: Vermelho Clássico (H=0, saturado e
 * claro) contra Borgonha (H=345, profundo e escuro), e Terracota (H=18,
 * alaranjado vivo) contra Clássico Elegante (H=23, marrom dessaturado).
 *
 * ## titleColor entrou, e é metade do motivo de antes parecerem iguais
 *
 * Até aqui nenhum preset definia `titleColor`, então os nomes do casal — o
 * maior elemento da página — saíam sempre do mesmo #2b221a em TODOS eles, e a
 * paleta só pintava o botão de CTA e o ornamento. Com `titleColor`, a cor
 * escolhida aparece onde ela é vista.
 *
 * ## As regras que todo preset daqui obedece (travadas em teste)
 *
 * - `primaryColor`, `secondaryColor` e `titleColor` ≥ 4.5:1 sobre branco;
 * - `ornamentColor` é isento de contraste por ser decoração (WCAG 1.4.11), MAS
 *   vira texto na faixa do Versículo, sobre a primária — então todo preset com
 *   ornamento próprio é medido por `checkOrnamentOnPrimary()`;
 * - `fontPairId` existe em FONT_PAIRS, e só `displayFontFamily` muda a página.
 *
 * ## Ids
 *
 * Preset cuja paleta mudou ganhou id NOVO, nunca o antigo reaproveitado: o id
 * fica gravado em `config_tema.presetId`, e reusá-lo faria a tela de Aparência
 * acender um cartão com cores diferentes das que o casal de fato tem. Quem
 * estava num preset extinto mantém exatamente as cores que escolheu (elas vivem
 * em `config_tema`, não aqui) e simplesmente deixa de ter cartão aceso.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classico-elegante',
    label: 'Clássico Elegante',
    primaryColor: '#6b4a35',
    secondaryColor: '#5f6f52',
    titleColor: '#4a3325',
    fontPairId: 'playfair-inter',
  },
  {
    id: 'borgonha-dourado',
    label: 'Borgonha & Dourado',
    // Funde os antigos Borgonha Editorial e Convite de Luxo: mesma família de
    // vinho, mesmo dourado, e a diferença entre eles era a fonte. O dourado
    // claro do convite continua aqui como ornamento — é o campo que existe
    // justamente para a cor que decora sem virar texto de corpo.
    primaryColor: '#5c1a2b',
    secondaryColor: '#8a6a1f',
    ornamentColor: '#cbaa71',
    titleColor: '#4a1522',
    fontPairId: 'cinzel-inter-montserrat',
  },
  {
    id: 'vermelho-classico',
    label: 'Vermelho Clássico',
    // Nasceu de um brief próprio (Fase Vermelho Clássico) e fica. O título sai
    // no vinho da secundária, não no vermelho vivo: nome de casal em #dc2626
    // grita mais do que convida.
    primaryColor: '#dc2626',
    secondaryColor: '#7f1d1d',
    titleColor: '#7f1d1d',
    fontPairId: 'cinzel-inter-montserrat',
  },
  {
    id: 'rose-nude',
    label: 'Rosé & Nude',
    primaryColor: '#9c4a63',
    secondaryColor: '#8a6a5c',
    titleColor: '#7a3549',
    fontPairId: 'cormorant-nunito',
  },
  {
    id: 'terracota-boho',
    label: 'Terracota Boho',
    primaryColor: '#a4512e',
    // Sage, não nude: terracota + verde acinzentado é o par boho de verdade, e
    // o nude já é a identidade do Rosé — repetir secundária é como o catálogo
    // antigo virou cinco variações da mesma coisa.
    secondaryColor: '#5a7d6a',
    titleColor: '#7d3c22',
    fontPairId: 'abril-worksans',
  },
  {
    id: 'verde-eucalipto',
    label: 'Verde Eucalipto',
    primaryColor: '#4f6f5b',
    secondaryColor: '#a4512e',
    titleColor: '#35513f',
    fontPairId: 'librebaskerville-karla',
  },
  {
    id: 'azul-marinho',
    label: 'Azul Marinho',
    primaryColor: '#1f3a5f',
    secondaryColor: '#8a6a1f',
    ornamentColor: '#cbaa71',
    titleColor: '#16293f',
    fontPairId: 'dmserif-dmsans',
  },
  {
    id: 'lavanda',
    label: 'Lavanda',
    primaryColor: '#6b5b95',
    secondaryColor: '#5d3a5e',
    titleColor: '#4e4170',
    fontPairId: 'cormorant-inter',
  },
  {
    id: 'preto-branco',
    label: 'Preto & Branco',
    primaryColor: '#2e2e30',
    secondaryColor: '#6b6b72',
    titleColor: '#1c1c1e',
    fontPairId: 'dmserif-dmsans',
  },
]

export const DEFAULT_FONT_PAIR_ID = 'playfair-inter'

/**
 * O tema resultante de aplicar um preset sobre o que o casal já tem.
 *
 * Existe porque aplicar preset acontece em DOIS lugares — a tela de Aparência,
 * onde o formulário já carrega todos os campos, e o wizard de Primeiros passos,
 * onde o tema pode estar literalmente vazio. No segundo, montar o objeto à mão
 * quebrava: `themeConfigSchema` exige `showCountdown` e ele não tem default, e
 * um casamento recém-criado tem `config_tema = {}`. O sintoma era um toast
 * genérico de "não foi possível salvar" sem nenhuma requisição ter saído.
 *
 * Os campos que o preset não decide são preservados quando existem e caem no
 * padrão da plataforma quando não — e o resultado é sempre um objeto que passa
 * pelo schema.
 */
export function aplicarPresetNoTema(
  temaAtual: Record<string, unknown> | null | undefined,
  preset: ThemePreset,
): Record<string, unknown> {
  const tema = temaAtual ?? {}
  return {
    ...tema,
    presetId: preset.id,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    // Preset sem ornamento próprio LIMPA o campo em vez de manter o dourado do
    // preset anterior — mesma regra da tela de Aparência.
    ornamentColor: preset.ornamentColor ?? '',
    // Como o ornamento: preset sem título próprio LIMPA o campo, senão o
    // lavanda do preset anterior pintaria os nomes numa paleta verde.
    titleColor: preset.titleColor ?? '',
    fontPairId: preset.fontPairId,
    // O único obrigatório do schema sem default. A contagem regressiva é
    // assinatura de site de casamento: ligada é o padrão da plataforma.
    showCountdown: typeof tema.showCountdown === 'boolean' ? tema.showCountdown : true,
  }
}

export function findThemePreset(presetId: string | undefined): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === presetId)
}

export function findFontPair(fontPairId: string | undefined): FontPair | undefined {
  return FONT_PAIRS.find((pair) => pair.id === fontPairId)
}
