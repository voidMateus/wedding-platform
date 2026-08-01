import { z } from 'zod'

// Metadados editáveis de uma foto já enviada (Fase Editorial — Galeria).
// O arquivo em si nunca passa por aqui: upload é multipart/form-data,
// tratado à parte em server/api/photos/index.post.ts (mesmo padrão do
// upload da foto de capa, CLAUDE.md seção 28).
export const photoMetadataSchema = z.object({
  caption: z.string().trim().max(200).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int('A ordem deve ser um número inteiro.').min(0).default(0),
  // Ponto de foco (enquadramento) — percentual 0-100, default 50/50 = centro
  // (CLAUDE.md, seção 22.2 — ferramenta de enquadramento no upload).
  focalX: z.coerce.number().int('Deve ser um número inteiro.').min(0).max(100).default(50),
  focalY: z.coerce.number().int('Deve ser um número inteiro.').min(0).max(100).default(50),
})

export type PhotoMetadataInput = z.infer<typeof photoMetadataSchema>
