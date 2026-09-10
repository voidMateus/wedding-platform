import { z } from 'zod'

// Compartilhado entre client (fluxo público de RSVP) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Busca por nome + confirmação leve substitui o
// código como caminho principal (CLAUDE.md, seção 12.1) — o link/QR direto
// (/rsvp/[code]) continua existindo como atalho.

export const RSVP_SEARCH_MIN_CHARS = 3

export const rsvpSearchQuerySchema = z.object({
  q: z.string().trim().min(RSVP_SEARCH_MIN_CHARS, 'Digite ao menos 3 letras.').max(100),
})

export const rsvpSelectSchema = z.object({
  guestId: z.string().uuid(),
})

export const rsvpConfirmSchema = z.object({
  guestId: z.string().uuid(),
})

export const rsvpGuestStatusSchema = z.object({
  status: z.enum(['confirmado', 'recusado'], { message: 'Selecione se você vai comparecer.' }),
})

export type RsvpGuestStatusInput = z.infer<typeof rsvpGuestStatusSchema>

/**
 * Resposta registrada pelo CASAL, para o convidado que não usa o site.
 *
 * Existe porque o funil de status do convite não pode exigir jornada digital: a
 * avó que confirma por telefone precisa chegar a "respondido" sem nunca abrir o
 * link. Sem este caminho, o acompanhamento só funcionaria para quem responde
 * online — e o produto tem que representar o casamento, não a atividade dentro
 * do site (docs/PRODUCT.md seção 5).
 *
 * Aceita mais valores que o schema do convidado acima, e um a menos que o
 * CHECK do banco:
 *
 * - `lista_espera` porque é decisão do casal, não do convidado.
 * - `pendente` porque registrar por engano precisa ter volta.
 * - **`removido` fica de fora**: é valor morto do enum (nada no produto o
 *   grava, "Remover do convite" só faz `convite_id = null`, e o fluxo do
 *   convidado o converte em `pendente` na leitura). Oferecê-lo aqui o faria
 *   contar como resposta na view, e um convite sem ninguém confirmado passaria
 *   a dizer "respondido".
 */
export const rsvpAdminStatusSchema = z.object({
  status: z.enum(['pendente', 'confirmado', 'recusado', 'lista_espera'], {
    message: 'Resposta inválida.',
  }),
})

export type RsvpAdminStatusInput = z.infer<typeof rsvpAdminStatusSchema>

export const rsvpCompanionSchema = z.object({
  nomeCompleto: z.string().trim().min(1, 'Informe o nome do acompanhante.').max(200),
})

export const rsvpFinalizeSchema = z.object({
  companions: z.array(rsvpCompanionSchema).max(50).optional().default([]),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type RsvpFinalizeInput = z.infer<typeof rsvpFinalizeSchema>
