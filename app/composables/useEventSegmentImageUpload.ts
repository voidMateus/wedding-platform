/**
 * Upload/remoção da foto de local de um item do cronograma (CLAUDE.md,
 * seção 28/"Fase Linguagem Visual"). Toda chamada de rede do client passa
 * por aqui (CLAUDE.md, seção 5.1).
 */
export function useEventSegmentImageUpload() {
  async function uploadEventSegmentImage(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return $fetch<{ url: string }>(`/api/event-segments/${id}/image-upload`, {
      method: 'POST',
      body: formData,
    })
  }

  async function removeEventSegmentImage(id: string): Promise<{ removed: boolean }> {
    return $fetch<{ removed: boolean }>(`/api/event-segments/${id}/image-upload`, { method: 'DELETE' })
  }

  return { uploadEventSegmentImage, removeEventSegmentImage }
}
