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

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classico-elegante',
    label: 'Clássico Elegante',
    primaryColor: '#6b4a35',
    secondaryColor: '#5f6f52',
    fontPairId: 'playfair-inter',
  },
  {
    id: 'borgonha-editorial',
    label: 'Borgonha Editorial',
    primaryColor: '#5c1a2b',
    secondaryColor: '#8a6a1f',
    fontPairId: 'dmserif-dmsans',
  },
  {
    id: 'romantico-pastel',
    label: 'Romântico',
    primaryColor: '#a15c6b',
    secondaryColor: '#7d6529',
    fontPairId: 'cormorant-nunito',
  },
  {
    id: 'moderno-minimalista',
    label: 'Moderno Minimalista',
    primaryColor: '#2f4858',
    secondaryColor: '#5c5450',
    fontPairId: 'dmserif-dmsans',
  },
  {
    id: 'ousado-contrastante',
    label: 'Ousado',
    primaryColor: '#6e2439',
    secondaryColor: '#8a6d1f',
    fontPairId: 'abril-worksans',
  },
  {
    id: 'natural-organico',
    label: 'Natural Orgânico',
    primaryColor: '#3f5b3f',
    secondaryColor: '#a35d3a',
    fontPairId: 'librebaskerville-karla',
  },
  {
    id: 'vermelho-classico',
    label: 'Vermelho Clássico',
    primaryColor: '#dc2626',
    secondaryColor: '#7f1d1d',
    fontPairId: 'cinzel-inter-montserrat',
  },
  // "Convite de Luxo" (Fase Linguagem Visual, Rodada 6) — borgonha profundo
  // + dourado fosco sobre marfim, brief explícito do usuário inspirado em
  // marcas de luxo. O dourado do brief (#C8A56A) não passa no contraste
  // mínimo (≈2.3:1, seção 22.4) — usa o mesmo dourado fosco escuro já
  // validado do preset borgonha-editorial; ornamentos decorativos clareiam
  // via opacidade, sem burlar a validação de texto.
  //
  // Desde a Fase Rebrand do Convite, o dourado claro do convite tem lugar
  // próprio: entra como `ornamentColor`, campo decorativo que nunca vira cor
  // de corpo de texto (ver themeConfigSchema) — é a diferença entre "burlar
  // a validação" e "ter um token para o que de fato é ornamento".
  //
  // #cbaa71, não o #C8A56A exato do convite: o ornamento é isento de
  // contraste como decoração, mas na seção Versículo ele vira texto sobre a
  // primária, e ali o dourado original fica em 4.41:1 — a um fio de reprovar
  // em AA. Dois pontos de luminosidade acima resolvem (4.65:1) sem que a
  // diferença seja perceptível lado a lado. Todo preset com ornamentColor é
  // coberto por esse teste de par em tests/unit/shared/theme-presets.spec.ts.
  {
    id: 'convite-luxo',
    label: 'Convite de Luxo',
    primaryColor: '#7a1f24',
    secondaryColor: '#8a6a1f',
    ornamentColor: '#cbaa71',
    fontPairId: 'cinzel-inter-montserrat',
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
