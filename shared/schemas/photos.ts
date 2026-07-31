import { z } from 'zod'

// Metadados editáveis de uma foto já enviada (Fase Editorial — Galeria).
// O arquivo em si nunca passa por aqui: upload é multipart/form-data,
// tratado à parte em server/api/photos/index.post.ts (mesmo padrão do
// upload da foto de capa, CLAUDE.md seção 28).
export const photoMetadataSchema = z.object({
  caption: z.string().trim().max(200).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int('A ordem deve ser um número inteiro.').min(0).default(0),
})

export type PhotoMetadataInput = z.infer<typeof photoMetadataSchema>
