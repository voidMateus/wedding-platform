import { z } from 'zod'

// Conexão da galeria com a fonte externa (Fase Galeria via Google Drive —
// CLAUDE.md). Schemas compartilhados client/server (#shared).

// Modo OAuth: o client obtém o authorization code (Google Identity Services)
// e a pasta escolhida no Google Picker num único passo — o servidor troca o
// code por refresh token e grava a conexão já com a pasta.
export const galleryGoogleConnectSchema = z.object({
  code: z.string().min(1, 'Código de autorização ausente.'),
  folderId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Id de pasta inválido.'),
  folderName: z.string().trim().max(200).optional(),
})

// Modo link público: o casal cola a URL de compartilhamento de uma pasta
// "qualquer pessoa com o link". O servidor extrai o folder id (nunca confia
// num id colado direto sem validar que a listagem funciona).
export const galleryPublicLinkSchema = z.object({
  folderUrl: z.string().trim().min(1, 'Informe o link da pasta do Google Drive.'),
})

export type GalleryGoogleConnectInput = z.infer<typeof galleryGoogleConnectSchema>
export type GalleryPublicLinkInput = z.infer<typeof galleryPublicLinkSchema>

// Prévia da Galeria na home: quantas fotos aparecem antes do botão "Abrir
// galeria" (página dedicada /{slug}/galeria). Ausente no theme_config = default.
export const DEFAULT_GALLERY_PREVIEW_COUNT = 8

export const galleryPreviewSchema = z.object({
  // 0 = mostra só o botão "Abrir galeria", sem nenhuma prévia na home.
  count: z.coerce
    .number()
    .int('Informe um número inteiro.')
    .min(0, 'A quantidade não pode ser negativa.')
    .max(48, 'No máximo 48 fotos na prévia.'),
})

export type GalleryPreviewInput = z.infer<typeof galleryPreviewSchema>
