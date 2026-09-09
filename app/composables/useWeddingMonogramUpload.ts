/**
 * Upload/remoção do monograma do casal (Fase Rebrand do Convite). Mesmo
 * contrato dos uploads de capa e da foto da história — toda chamada de rede
 * do client passa por um composable (CLAUDE.md, seção 5.1).
 */
export function useWeddingMonogramUpload() {
  async function uploadMonogramImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return $fetch<{ url: string }>('/api/wedding/theme/monogram-upload', {
      method: 'POST',
      body: formData,
    })
  }

  async function removeMonogramImage(): Promise<{ removed: boolean }> {
    return $fetch<{ removed: boolean }>('/api/wedding/theme/monogram-upload', { method: 'DELETE' })
  }

  return { uploadMonogramImage, removeMonogramImage }
}
