interface ImageUploaderHandlers {
  upload: (file: File) => Promise<{ url: string }>
  remove: () => Promise<unknown>
}

/**
 * Lógica de upload/remoção de imagem compartilhada por CoverImageUploader,
 * StoryImageUploader e EventSegmentImageUploader — cada um injeta as
 * funções já vinculadas (ex.: EventSegmentImageUploader vincula o
 * segmentId antes de passar pra cá). Ponto de foco (capa/história) fica de
 * fora de propósito: EventSegmentImageUploader não tem, não é lógica
 * comum aos 3.
 */
export function useImageUploader({ upload, remove }: ImageUploaderHandlers) {
  const fileInput = ref<HTMLInputElement | null>(null)
  const isUploading = ref(false)
  const isRemoving = ref(false)
  const errorMessage = ref<string | null>(null)

  function openFilePicker() {
    fileInput.value?.click()
  }

  async function handleFileChange(event: Event): Promise<string | undefined> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return undefined

    errorMessage.value = null
    isUploading.value = true
    try {
      const { url } = await upload(file)
      return url
    } catch {
      errorMessage.value =
        'Não foi possível enviar a foto. Verifique o formato (JPEG/PNG/WebP) e o tamanho (máx. 5MB).'
      return undefined
    } finally {
      isUploading.value = false
      input.value = ''
    }
  }

  async function handleRemove(): Promise<boolean> {
    errorMessage.value = null
    isRemoving.value = true
    try {
      await remove()
      return true
    } catch {
      errorMessage.value = 'Não foi possível remover a foto.'
      return false
    } finally {
      isRemoving.value = false
    }
  }

  return { fileInput, isUploading, isRemoving, errorMessage, openFilePicker, handleFileChange, handleRemove }
}
