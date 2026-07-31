/**
 * Upload/remoção da foto de capa do site (CLAUDE.md, seção 28). Toda
 * chamada de rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useWeddingCoverUpload() {
  async function uploadCoverImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return $fetch<{ url: string }>('/api/wedding/theme/cover-upload', {
      method: 'POST',
      body: formData,
    })
  }

  async function removeCoverImage(): Promise<{ removed: boolean }> {
    return $fetch<{ removed: boolean }>('/api/wedding/theme/cover-upload', { method: 'DELETE' })
  }

  return { uploadCoverImage, removeCoverImage }
}
