import { z } from 'zod'
import { FAIXA_ETARIA_CHAVES } from '#shared/utils/faixa-etaria'

// Compartilhado entre client (wizard de convidado) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Mesmos campos para o convidado principal e cada
// acompanhante — só o convidado principal do wizard tem convite/grupoId
// resolvidos no fluxo, os demais herdam via sincronizar_nucleo_convidado.

export const guestPersonSchema = z.object({
  id: z.string().uuid().optional(),
  nomeCompleto: z.string().trim().min(1, 'Informe o nome.').max(200),
  apelido: z.string().trim().max(100).optional().or(z.literal('')),
  sexo: z.enum(['masculino', 'feminino', 'outro']).optional().or(z.literal('')),
  // <input type="date"> envia "yyyy-mm-dd" — Postgres aceita direto.
  // Opcional de verdade: o casal raramente sabe a data de nascimento de todos
  // os convidados, e sem ela a faixa manual abaixo assume (CLAUDE.md, seção 12).
  dataNascimento: z.string().trim().optional().or(z.literal('')),
  // Faixa etária informada à mão — vale SÓ na ausência de dataNascimento;
  // com data de nascimento, a classificação é sempre calculada na data do
  // evento (shared/utils/faixa-etaria.ts#classificarFaixaEtaria).
  faixaEtariaManual: z.enum(FAIXA_ETARIA_CHAVES).optional().or(z.literal('')),
  caminhoFoto: z.string().trim().optional().or(z.literal('')),
  papelCasamento: z.enum(['padrinho', 'madrinha']).optional().or(z.literal('')),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
  grupoId: z.string().uuid().optional().or(z.literal('')),
})

export type GuestPersonInput = z.infer<typeof guestPersonSchema>

export const guestPartyInviteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, 'Informe um nome para o convite.').max(160),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const guestPartySyncSchema = z.object({
  primary: guestPersonSchema,
  companions: z.array(guestPersonSchema).default([]),
  removedGuestIds: z.array(z.string().uuid()).default([]),
  invite: guestPartyInviteSchema.optional(),
})

export type GuestPartySyncInput = z.infer<typeof guestPartySyncSchema>

export const guestPartyReorderSchema = z.object({
  partyId: z.string().uuid(),
  orderedGuestIds: z.array(z.string().uuid()).min(1),
})

export type GuestPartyReorderInput = z.infer<typeof guestPartyReorderSchema>
