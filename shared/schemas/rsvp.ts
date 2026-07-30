import { z } from 'zod'

// Compartilhado entre client (RsvpForm) e server (revalidação — CLAUDE.md,
// seção 8/20.1). Espelha o contrato de confirm_rsvp() (supabase/migrations,
// 20260730120021): companions só é aceito quando status = 'confirmed'
// (CLAUDE.md, seção 16.3 — recusar não pede acompanhante/restrição).

export const rsvpCompanionSchema = z.object({
  fullName: z.string().trim().min(1, 'Informe o nome do acompanhante.').max(200),
  dietaryRestrictions: z.string().trim().max(500).optional().or(z.literal('')),
})

export type RsvpCompanionInput = z.infer<typeof rsvpCompanionSchema>

export const rsvpSubmitSchema = z
  .object({
    status: z.enum(['confirmed', 'declined'], { message: 'Selecione se você vai comparecer.' }),
    dietaryNotes: z.string().trim().max(1000).optional().or(z.literal('')),
    message: z.string().trim().max(2000).optional().or(z.literal('')),
    companions: z.array(rsvpCompanionSchema).max(50).optional().default([]),
  })
  .refine((value) => value.status === 'confirmed' || value.companions.length === 0, {
    message: 'Acompanhantes só podem ser informados ao confirmar presença.',
    path: ['companions'],
  })

export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>
