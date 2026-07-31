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

// coverImageUrl NÃO faz parte deste schema de propósito: é gerido
// exclusivamente por POST/DELETE /api/wedding/theme/cover-upload (upload
// real via Storage), nunca submetido junto com o restante do formulário de
// Aparência — evita que salvar cor/fonte apague a foto de capa por engano.
export const themeConfigSchema = z.object({
  presetId: z.string().trim().optional().or(z.literal('')),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  fontPairId: z.string().trim().min(1, 'Selecione um par tipográfico.'),
  showCountdown: z.boolean(),
})

export type ThemeConfigInput = z.infer<typeof themeConfigSchema>

/** Shape completo de weddings.theme_config como lido do banco (inclui coverImageUrl, gerido à parte). */
export interface ThemeConfig {
  presetId?: string
  primaryColor: string
  secondaryColor: string
  fontPairId: string
  coverImageUrl?: string
  showCountdown: boolean
}
