<script setup lang="ts">
// "Nossos Momentos" — prévia curta de fotos ao final da home. Desde a Fase
// Galeria via Google Drive (CLAUDE.md), `photos` espelha uma pasta do Google
// Drive e a quantidade da prévia é configurável pelo casal
// (config_tema.galleryPreviewCount). Havendo mais fotos que a prévia, um
// botão "Abrir galeria" leva à página dedicada /{slug}/galeria.
import { DEFAULT_GALLERY_PREVIEW_COUNT } from '#shared/schemas/gallery'
import type { ThemeConfig } from '#shared/schemas/theme'

const { getPublicPhotos } = usePublicPhotos()
const { getPublicWedding } = usePublicWedding()
const { data } = getPublicPhotos()
const { data: wedding } = getPublicWedding()
const slug = useWeddingSlug()

const photos = computed(() => data.value?.data ?? [])
const previewCount = computed(() => {
  const themeConfig = wedding.value?.config_tema as unknown as ThemeConfig | null
  return themeConfig?.galleryPreviewCount ?? DEFAULT_GALLERY_PREVIEW_COUNT
})
const previewPhotos = computed(() => photos.value.slice(0, previewCount.value))
const hasMore = computed(() => photos.value.length > previewCount.value)
</script>

<template>
  <PublicEditorialSection
    v-if="photos.length"
    id="nossos-momentos"
    eyebrow="Registros"
    title="Nossos Momentos"
  >
    <!-- previewCount = 0 → só o botão, sem prévia -->
    <PublicPhotoGrid v-if="previewPhotos.length" :photos="previewPhotos" variant="preview" />

    <div v-if="hasMore" class="mt-8 flex justify-center">
      <UiButton :to="`/${slug}/galeria`" variant="outline" rounded="full">Abrir galeria</UiButton>
    </div>
  </PublicEditorialSection>
</template>
