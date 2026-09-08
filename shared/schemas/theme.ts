import { z } from 'zod'
import { checkColorContrast, isValidHexColor } from '../utils/contrast'
import { DEFAULT_HERO_BUTTONS, HERO_BUTTON_CATALOG } from '../hero-buttons'
import { DEFAULT_SECTION_ORDER, HOME_SECTION_CATALOG } from '../home-sections'

const HERO_BUTTON_ID_SET = new Set(HERO_BUTTON_CATALOG.map((button) => button.id))
const heroButtonIdSchema = z
  .string()
  .refine((id) => HERO_BUTTON_ID_SET.has(id), 'Atalho desconhecido.')

const HOME_SECTION_ID_SET = new Set(HOME_SECTION_CATALOG.map((section) => section.id))
const homeSectionIdSchema = z
  .string()
  .refine((id) => HOME_SECTION_ID_SET.has(id), 'Seção desconhecida.')

/**
 * Estilo tipográfico dos títulos de seção do site público (Fase Rebrand do
 * Convite). Union de string literal, nunca enum do TypeScript (CLAUDE.md,
 * seção 8) — e o valor viaja para o CSS como um `data-heading-style` no
 * :root, não como uma classe espalhada em cada componente.
 */
export const HEADING_STYLES = ['classic', 'engraved'] as const
export type HeadingStyle = (typeof HEADING_STYLES)[number]

// Compartilhado entre client (Aparência, admin) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Endpoint próprio (PATCH /api/wedding/theme),
// separado dos dados de negócio do evento (PATCH /api/wedding) — mesma
// filosofia já documentada em config_tema: "exclusivamente atributos
// visuais, nunca comportamento de negócio" (CLAUDE.md, seção 22.3).

/**
 * Mensagens de erro dos campos de cor. Ficam em constantes porque valem para
 * os quatro campos de cor do tema e também para a cor de grupo
 * (`optionalHexColorSchema`, reusado em schemas/groups.ts) — antes o mesmo
 * texto estava copiado em cada `refine`.
 *
 * São texto de INTERFACE, lido pelo casal na hora de salvar. Por isso não
 * citam a razão de contraste, o limiar do WCAG nem seção de documentação
 * interna: nada disso ajuda quem só quer escolher a cor do próprio site, e a
 * referência a arquivo de projeto não tem por que existir numa tela de
 * produto. A frase diz o que está errado, a consequência e o que fazer — e
 * casa com o aviso que o AdminSettingsContrastHint mostra em tempo real, para
 * a tela e o erro de salvar não falarem línguas diferentes.
 */
const HEX_FORMAT_MESSAGE = 'Informe uma cor em formato hexadecimal (ex: #6b4a35).'
const LOW_CONTRAST_MESSAGE =
  'Este tom é claro demais para o fundo do site e deixa o texto difícil de ler. Escolha um tom mais escuro.'

const hexColorSchema = z
  .string()
  .trim()
  .refine(isValidHexColor, HEX_FORMAT_MESSAGE)
  .refine(
    (hex) => !isValidHexColor(hex) || checkColorContrast(hex).meetsMinimum,
    LOW_CONTRAST_MESSAGE,
  )

// Cor avançada (Fase Editorial): titleColor/bodyColor são opcionais — quando
// ausentes, o site cai no --color-text neutro padrão (ver
// useWeddingTheme.ts). String vazia é tratada como "não definido", não como
// erro de validação, para o form poder limpar a sobrescrita.
// Exportado para reuso em qualquer campo de cor opcional fora do tema do
// casamento (ex.: groups.color — CLAUDE.md, seção 22.3) que precise do mesmo
// contraste mínimo.
export const optionalHexColorSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((hex) => hex === undefined || isValidHexColor(hex), HEX_FORMAT_MESSAGE)
  .refine((hex) => hex === undefined || checkColorContrast(hex).meetsMinimum, LOW_CONTRAST_MESSAGE)

/**
 * Cor de ORNAMENTO — filetes, o "&" do Hero, divisores, moldura das seções,
 * monograma. Deliberadamente FORA da regra de contraste mínimo que vale para
 * as demais cores do tema, e essa é a razão de ela existir como campo próprio
 * em vez de "mais uma cor": o dourado do convite (#C8A56A) fica em ≈2.3:1
 * contra o marfim e reprovaria como cor de texto — corretamente, porque como
 * texto ele é ilegível mesmo.
 *
 * O que a isenção NÃO é: uma porta dos fundos para pintar texto de dourado. O
 * WCAG 1.4.11 exclui do requisito de contraste justamente o que é puramente
 * decorativo, e é só isso que este token pinta. Nenhum componente usa
 * --color-ornament em texto de corpo, título ou rótulo de botão.
 *
 * A única exceção é o texto do Versículo, e ela é exceção só na aparência: lá
 * o dourado fica sobre a cor primária escura, não sobre o marfim, e é ESSE par
 * que precisa passar em AA. Quem verifica isso é checkOrnamentOnPrimary(),
 * chamado pelo aviso da tela de Aparência — validar aqui contra o fundo errado
 * (o off-white) reprovaria uma combinação que na tela é perfeitamente legível.
 */
export const ornamentHexColorSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((hex) => hex === undefined || isValidHexColor(hex), HEX_FORMAT_MESSAGE)

// coverImageUrl/storyImageUrl NÃO fazem parte deste schema de propósito: são
// geridos exclusivamente por POST/DELETE /api/wedding/theme/cover-upload e
// /api/wedding/theme/story-upload (upload real via Storage, arquivos
// independentes — CLAUDE.md, feedback de produto: a foto de capa do Hero e a
// foto da seção "Nossa História" são fotos diferentes, não a mesma
// reaproveitada), nunca submetidos junto com o restante do formulário de
// Aparência — evita que salvar cor/fonte apague uma foto por engano.
export const themeConfigSchema = z.object({
  presetId: z.string().trim().optional().or(z.literal('')),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  titleColor: optionalHexColorSchema,
  bodyColor: optionalHexColorSchema,
  ornamentColor: ornamentHexColorSchema,
  fontPairId: z.string().trim().min(1, 'Selecione um par tipográfico.'),
  headingStyle: z.enum(HEADING_STYLES).default('classic'),
  /** Moldura de filete duplo em volta das seções, como a do convite impresso. */
  ornamentFrame: z.boolean().default(false),
  showCountdown: z.boolean(),
  /**
   * Ordem dos capítulos da home. Ids validados contra o catálogo
   * (shared/home-sections.ts) — uma lista salva ainda passa por
   * resolveHomeSectionOrder() na renderização, que é quem completa seções
   * ausentes e descarta repetição. Aqui só barramos id inventado.
   */
  sectionOrder: z
    .array(homeSectionIdSchema)
    .max(HOME_SECTION_CATALOG.length)
    .default(DEFAULT_SECTION_ORDER),
  // Atalhos do Hero (CLAUDE.md, seção 21 — "Fase Vermelho Clássico"): o
  // casal escolhe quais botões aparecem e qual fica em destaque (cor
  // preenchida); os demais ficam em outline. Catálogo fixo em
  // shared/hero-buttons.ts — só a seleção é editável, não o catálogo.
  heroButtons: z
    .array(heroButtonIdSchema)
    .max(HERO_BUTTON_CATALOG.length)
    .default(DEFAULT_HERO_BUTTONS),
  heroFeaturedButton: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((id) => id === undefined || HERO_BUTTON_ID_SET.has(id), 'Atalho desconhecido.'),
})

export type ThemeConfigInput = z.infer<typeof themeConfigSchema>

// Ponto de foco (enquadramento) da foto de capa ou da foto da "Nossa
// História" — endpoint próprio (PATCH /api/wedding/theme/focal-point),
// separado do upload em si (o foco só pode ser escolhido depois de ver a
// prévia da foto já enviada) e do restante da Aparência, mesma filosofia já
// documentada para coverImageUrl/storyImageUrl.
export const themeFocalPointSchema = z.object({
  target: z.enum(['cover', 'story']),
  x: z.coerce.number().int('Deve ser um número inteiro.').min(0).max(100),
  y: z.coerce.number().int('Deve ser um número inteiro.').min(0).max(100),
})

export type ThemeFocalPointInput = z.infer<typeof themeFocalPointSchema>

/** Shape completo de casamentos.config_tema como lido do banco (inclui coverImageUrl, gerido à parte). */
export interface ThemeConfig {
  presetId?: string
  primaryColor: string
  secondaryColor: string
  /** Modo de cor avançada (Fase Editorial) — sobrescreve --color-heading. Opcional, sem default próprio. */
  titleColor?: string
  /** Modo de cor avançada (Fase Editorial) — sobrescreve --color-body. Opcional, sem default próprio. */
  bodyColor?: string
  /** Cor de ornamento (Fase Rebrand do Convite) — sobrescreve --color-ornament, que sem ela herda a secundária. */
  ornamentColor?: string
  fontPairId: string
  /** 'engraved' = títulos em caixa alta com tracking largo, como os do convite. Ausente = 'classic'. */
  headingStyle?: HeadingStyle
  /** Moldura de filete duplo em volta das seções. Ausente = false. */
  ornamentFrame?: boolean
  /** Ordem dos capítulos da home — ids de shared/home-sections.ts. Ausente = DEFAULT_SECTION_ORDER. */
  sectionOrder?: string[]
  coverImageUrl?: string
  /**
   * Monograma próprio do casal (PNG/WebP transparente), gerido pelos
   * endpoints de upload como coverImageUrl/storyImageUrl — nunca pelo
   * formulário de Aparência. Ausente = o monograma é desenhado a partir das
   * iniciais do casal.
   */
  monogramImageUrl?: string
  /** Foto da seção "Nossa História" — independente de coverImageUrl (Hero). */
  storyImageUrl?: string
  /** Ponto de foco (0-100%, default 50/50 = centro) usado como object-position da foto de capa. */
  coverFocalX?: number
  coverFocalY?: number
  /** Ponto de foco (0-100%, default 50/50 = centro) usado como object-position da foto da história. */
  storyFocalX?: number
  storyFocalY?: number
  showCountdown: boolean
  /** Atalhos selecionados para o Hero — ids do catálogo em shared/hero-buttons.ts. */
  heroButtons?: string[]
  /** Id do atalho em destaque (cor preenchida) — os demais ficam em outline. */
  heroFeaturedButton?: string
  /**
   * Quantas fotos aparecem na prévia da Galeria na home antes do botão "Abrir
   * galeria" (Fase Galeria via Google Drive). Ausente = DEFAULT_GALLERY_PREVIEW_COUNT.
   * Gerido por PATCH /api/wedding/gallery/preview; preservado pelo spread de
   * theme.patch.ts (fora da lista de chaves daquele endpoint), como coverImageUrl.
   */
  galleryPreviewCount?: number
}
