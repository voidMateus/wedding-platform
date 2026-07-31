/**
 * Upload/remoção da foto da seção "Nossa História" (CLAUDE.md, seção 28) —
 * independente da foto de capa do Hero (useWeddingCoverUpload.ts). Toda
 * chamada de rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useWeddingStoryUpload() {
  async function uploadStoryImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return $fetch<{ url: string }>('/api/wedding/theme/story-upload', {
      method: 'POST',
      body: formData,
    })
  }

  async function removeStoryImage(): Promise<{ removed: boolean }> {
    return $fetch<{ removed: boolean }>('/api/wedding/theme/story-upload', { method: 'DELETE' })
  }

  return { uploadStoryImage, removeStoryImage }
}
