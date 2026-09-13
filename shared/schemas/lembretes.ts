import { z } from 'zod'
import {
  DIAS_ANTES_PADRAO_PAGAMENTO,
  DIAS_ANTES_PADRAO_RSVP,
  MAX_DIAS_ANTES,
  MAX_MARCAS_LEMBRETE,
} from '#shared/utils/lembretes'

/**
 * O que o sistema manda sozinho, e quando.
 *
 * **Nasce desligado, sempre.** O padrão de todo o resto da plataforma é
 * conteúdo pronto que funciona sem ninguém configurar (os modelos de mensagem,
 * os textos do site); aqui é o contrário, e de propósito: os outros padrões
 * preenchem uma tela, este escreveria para a caixa de entrada de oitenta
 * pessoas com o nome do casal no remetente. Ligar é decisão dele.
 */

const diasAntesSchema = z
  .array(z.number().int().min(0).max(MAX_DIAS_ANTES))
  .max(MAX_MARCAS_LEMBRETE)
  // Ordenado e sem repetição na ENTRADA, não na leitura: gravado fora de
  // ordem, "3, 14" viraria "sai 3 dias antes e depois 14 dias antes" na tela,
  // que é o oposto do que acontece. E uma marca repetida não manda dois
  // e-mails — ela some, silenciosamente, quando o cron pergunta se a
  // distância de hoje está na lista.
  .transform((dias) => [...new Set(dias)].sort((a, b) => b - a))

export const configLembreteSchema = z.object({
  ativo: z.boolean(),
  diasAntes: diasAntesSchema,
})

export const configLembretesSchema = z.object({
  /** Ao CONVIDADO: confirme sua presença. */
  rsvp: configLembreteSchema,
  /** Ao CASAL: estas parcelas vencem. Público diferente, chave diferente. */
  pagamentos: configLembreteSchema,
})

export type ConfigLembrete = z.infer<typeof configLembreteSchema>
export type ConfigLembretes = z.infer<typeof configLembretesSchema>

export const LEMBRETES_PADRAO: ConfigLembretes = {
  rsvp: { ativo: false, diasAntes: DIAS_ANTES_PADRAO_RSVP },
  pagamentos: { ativo: false, diasAntes: DIAS_ANTES_PADRAO_PAGAMENTO },
}

/**
 * A configuração de um casamento, com o que faltar caído no padrão.
 *
 * Jsonb gravado por uma versão anterior do schema não pode derrubar o cron —
 * chave ausente, tipo errado ou jsonb vazio caem no padrão (desligado), que é
 * a degradação certa: na dúvida, o sistema não manda nada.
 */
export function lembretesDoCasamento(bruto: unknown): ConfigLembretes {
  const parsed = configLembretesSchema.partial().safeParse(bruto ?? {})
  if (!parsed.success) return LEMBRETES_PADRAO

  return {
    rsvp: parsed.data.rsvp ?? LEMBRETES_PADRAO.rsvp,
    pagamentos: parsed.data.pagamentos ?? LEMBRETES_PADRAO.pagamentos,
  }
}
