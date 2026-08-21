import { z } from 'zod'

// Compartilhado entre client (formulário de configurações) e server
// (revalidação — CLAUDE.md, seção 8/20.1).
//
// idadeMaximaCrianca/modoListaConvidados são comportamento de negócio,
// deliberadamente colunas próprias — nunca dentro de config_tema, que é só
// visual (CLAUDE.md, seção 16.2/22.3). A cor/fonte/foto de capa vivem em
// shared/schemas/theme.ts, endpoint próprio (PATCH /api/wedding/theme) —
// nunca neste schema de dados de negócio do evento.

// HH:MM ou HH:MM:SS — formato nativo do <input type="time">.
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/

export const weddingSettingsSchema = z.object({
  nomesNoivos: z.string().trim().min(1, 'Informe o nome do casal.').max(200),
  dataEvento: z.string().trim().min(1, 'Informe a data do casamento.'),
  horarioEvento: z
    .string()
    .trim()
    .regex(TIME_PATTERN, 'Informe um horário válido (HH:MM).')
    .optional()
    .or(z.literal('')),
  prazoRsvp: z.string().trim().optional().or(z.literal('')),
  idadeMaximaCrianca: z.coerce.number().int().min(0).max(30),
  modoListaConvidados: z.enum(['fechada', 'aberta']),
  // Handle público (sem "$") usado pro checkout online de presentes
  // (CLAUDE.md, seção 18/28) — vazio/ausente desativa o caminho pago. Os
  // métodos aceitos (Pix, cartão) são configurados na conta InfinitePay do
  // casal, não por este campo.
  handleInfinitepay: z.string().trim().max(100).optional().or(z.literal('')),
  // Quais formas de presentear um item físico ficam disponíveis ao convidado
  // (CLAUDE.md, seção 18) — não se aplica a Contribuições/Emocionais, que
  // sempre exigem pagamento online.
  modoEntregaPresenteFisico: z.enum(['ambos', 'somente_compra_propria', 'somente_pagamento']).default('ambos'),
})

export type WeddingSettingsInput = z.infer<typeof weddingSettingsSchema>
