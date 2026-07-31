import { z } from 'zod'
import { WCAG_AA_MIN_CONTRAST, checkPrimaryColorContrast, isValidHexColor } from '../utils/contrast'

// Compartilhado entre client (formulário de configurações) e server
// (revalidação — CLAUDE.md, seção 8/20.1).
//
// rsvpMode é comportamento de negócio, deliberadamente uma coluna própria —
// nunca dentro de theme_config, que é só visual (CLAUDE.md, seção 16.2/22.3).

// HH:MM ou HH:MM:SS — formato nativo do <input type="time">.
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/

export const weddingSettingsSchema = z.object({
  coupleNames: z.string().trim().min(1, 'Informe o nome do casal.').max(200),
  eventDate: z.string().trim().min(1, 'Informe a data do casamento.'),
  eventTime: z
    .string()
    .trim()
    .regex(TIME_PATTERN, 'Informe um horário válido (HH:MM).')
    .optional()
    .or(z.literal('')),
  rsvpMode: z.enum(['per_group', 'per_guest']),
  rsvpDeadline: z.string().trim().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .trim()
    .refine(isValidHexColor, 'Informe uma cor em formato hexadecimal (ex: #a8785c).')
    .refine(
      (hex) => !isValidHexColor(hex) || checkPrimaryColorContrast(hex).meetsMinimum,
      `Contraste insuficiente (mínimo ${WCAG_AA_MIN_CONTRAST}:1) entre essa cor e o fundo padrão — escolha um tom mais escuro (CLAUDE.md, seção 22.4).`,
    ),
})

export type WeddingSettingsInput = z.infer<typeof weddingSettingsSchema>
