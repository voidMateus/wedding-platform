/**
 * Upload/remoção da imagem da seção "Dress Code". Mesmo contrato dos uploads
 * de capa, história e monograma — toda chamada de rede do client passa por um
 * composable (CLAUDE.md, seção 5.1).
 */
export function useWeddingDressCodeUpload() {
  async function uploadDressCodeImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    return $fetch<{ url: string }>('/api/wedding/theme/dress-code-upload', {
      method: 'POST',
      body: formData,
    })
  }

  async function removeDressCodeImage(): Promise<{ removed: boolean }> {
    return $fetch<{ removed: boolean }>('/api/wedding/theme/dress-code-upload', {
      method: 'DELETE',
    })
  }

  return { uploadDressCodeImage, removeDressCodeImage }
}
