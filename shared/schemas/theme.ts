import { z } from 'zod'
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '../utils/contrast'

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
const optionalHexColorSchema = z
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
})

export type ThemeConfigInput = z.infer<typeof themeConfigSchema>

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
  showCountdown: boolean
}
