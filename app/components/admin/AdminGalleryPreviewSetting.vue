<script setup lang="ts">
import { DEFAULT_GALLERY_PREVIEW_COUNT } from '#shared/schemas/gallery'
import type { ThemeConfig } from '#shared/schemas/theme'

// Configura quantas fotos aparecem na prévia da Galeria na home antes do botão
// "Abrir galeria" (página dedicada). Valor vive em config_tema, salvo por
// endpoint próprio (CLAUDE.md, Fase Galeria via Google Drive).
const { getWedding } = useWedding()
const { updatePreview } = useGalleryConnection()
const toast = useToast()

const { data: wedding, refresh } = getWedding()

const count = ref<number>(DEFAULT_GALLERY_PREVIEW_COUNT)
watch(
  wedding,
  (value) => {
    const themeConfig = value?.config_tema as unknown as ThemeConfig | null
    count.value = themeConfig?.galleryPreviewCount ?? DEFAULT_GALLERY_PREVIEW_COUNT
  },
  { immediate: true },
)

const countText = computed({
  get: () => String(count.value),
  set: (value: string) => {
    count.value = value === '' ? DEFAULT_GALLERY_PREVIEW_COUNT : Number(value)
  },
})

const isSaving = ref(false)
async function save() {
  isSaving.value = true
  try {
    await updatePreview(count.value)
    await refresh()
    toast.success('Prévia da galeria atualizada.')
  } catch {
    toast.error('Não foi possível salvar. Use um número entre 0 e 48.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UiCard class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-sm font-medium text-text">Prévia na home</p>
      <p class="text-sm text-text-muted">
        Quantas fotos aparecem na home antes do botão "Abrir galeria" (que leva à página completa).
        Use <strong>0</strong> para mostrar só o botão, sem prévia.
      </p>
    </div>
    <div class="flex items-end gap-2">
      <UiInput v-model="countText" type="number" min="0" label="Fotos na prévia" class="w-28" />
      <UiButton :disabled="isSaving" @click="save">Salvar</UiButton>
    </div>
  </UiCard>
</template>
