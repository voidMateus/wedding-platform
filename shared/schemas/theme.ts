import { z } from 'zod'
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '../utils/contrast'
import { DEFAULT_HERO_BUTTONS, HERO_BUTTON_CATALOG } from '../hero-buttons'

const HERO_BUTTON_ID_SET = new Set(HERO_BUTTON_CATALOG.map((button) => button.id))
const heroButtonIdSchema = z.string().refine((id) => HERO_BUTTON_ID_SET.has(id), 'Atalho desconhecido.')

// Compartilhado entre client (Aparência, admin) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Endpoint próprio (PATCH /api/wedding/theme),
// separado dos dados de negócio do evento (PATCH /api/wedding) — mesma
// filosofia já documentada em theme_config: "exclusivamente atributos
// visuais, nunca comportamento de negócio" (CLAUDE.md, seção 22.3).

const hexColorSchema = z
  .string()
  .trim()
  .refine(isValidHexColor, 'Informe uma cor em formato hexadecimal (ex: #6b4a35).')
  .refine(
    (hex) => !isValidHexColor(hex) || checkColorContrast(hex).meetsMinimum,
    `Contraste insuficiente (mínimo ${WCAG_AA_MIN_CONTRAST}:1) entre essa cor e o fundo padrão — escolha um tom mais escuro (CLAUDE.md, seção 22.4).`,
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
  .refine((hex) => hex === undefined || isValidHexColor(hex), 'Informe uma cor em formato hexadecimal (ex: #6b4a35).')
  .refine(
    (hex) => hex === undefined || checkColorContrast(hex).meetsMinimum,
    `Contraste insuficiente (mínimo ${WCAG_AA_MIN_CONTRAST}:1) entre essa cor e o fundo padrão — escolha um tom mais escuro (CLAUDE.md, seção 22.4).`,
  )

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
  fontPairId: z.string().trim().min(1, 'Selecione um par tipográfico.'),
  showCountdown: z.boolean(),
  // Ilustrações botânicas em traço fino no Hero e na seção de boas-vindas
  // (Fase Linguagem Visual, Rodada 6) — opcionais por casamento, pedido do
  // usuário ("tem que ter opção também de ter os lírios ou não").
  showHeroBotanicals: z.boolean().default(true),
  // Atalhos do Hero (CLAUDE.md, seção 21 — "Fase Vermelho Clássico"): o
  // casal escolhe quais botões aparecem e qual fica em destaque (cor
  // preenchida); os demais ficam em outline. Catálogo fixo em
  // shared/hero-buttons.ts — só a seleção é editável, não o catálogo.
  heroButtons: z.array(heroButtonIdSchema).max(HERO_BUTTON_CATALOG.length).default(DEFAULT_HERO_BUTTONS),
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

/** Shape completo de weddings.theme_config como lido do banco (inclui coverImageUrl, gerido à parte). */
export interface ThemeConfig {
  presetId?: string
  primaryColor: string
  secondaryColor: string
  /** Modo de cor avançada (Fase Editorial) — sobrescreve --color-heading. Opcional, sem default próprio. */
  titleColor?: string
  /** Modo de cor avançada (Fase Editorial) — sobrescreve --color-body. Opcional, sem default próprio. */
  bodyColor?: string
  fontPairId: string
  coverImageUrl?: string
  /** Foto da seção "Nossa História" — independente de coverImageUrl (Hero). */
  storyImageUrl?: string
  /** Ponto de foco (0-100%, default 50/50 = centro) usado como object-position da foto de capa. */
  coverFocalX?: number
  coverFocalY?: number
  /** Ponto de foco (0-100%, default 50/50 = centro) usado como object-position da foto da história. */
  storyFocalX?: number
  storyFocalY?: number
  showCountdown: boolean
  /** Ilustrações botânicas decorativas no Hero/boas-vindas (default true). */
  showHeroBotanicals?: boolean
  /** Atalhos selecionados para o Hero — ids do catálogo em shared/hero-buttons.ts. */
  heroButtons?: string[]
  /** Id do atalho em destaque (cor preenchida) — os demais ficam em outline. */
  heroFeaturedButton?: string
}
