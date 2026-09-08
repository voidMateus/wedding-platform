<script setup lang="ts">
// Página dedicada da galeria (Fase Galeria via Google Drive) — todas as fotos
// do casamento, para além da prévia da home. Layout público (default), grade
// completa + lightbox reutilizados de PublicPhotoGrid.
const { getPublicPhotos } = usePublicPhotos()
const { getPublicWedding } = usePublicWedding()
const { data, status } = getPublicPhotos()
const { data: wedding } = await getPublicWedding()

// Slug inexistente responde 404 de verdade (mesma regra da home): a página não
// pode existir sem o casamento por trás dela. `fatal` para o erro subir no SSR
// e o status HTTP ser realmente 404, não uma tela de erro dentro de um 200.
if (!wedding.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casamento não encontrado', fatal: true })
}
const slug = useWeddingSlug()

const photos = computed(() => data.value?.data ?? [])

useSeoMeta({
  title: () => (wedding.value ? `Galeria — ${wedding.value.nomes_noivos}` : 'Galeria'),
  description: 'Todas as fotos do nosso casamento.',
})
</script>

<template>
  <PublicEditorialSection id="galeria" eyebrow="Registros" title="Nossos Momentos">
    <div class="mb-8 flex justify-center">
      <UiButton :to="`/${slug}`" variant="outline" rounded="full">Voltar ao início</UiButton>
    </div>

    <div
      v-if="status === 'pending'"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      <UiSkeleton v-for="n in 10" :key="n" class="aspect-square w-full rounded-xl" />
    </div>

    <UiEmptyState
      v-else-if="!photos.length"
      icon="lucide:image"
      title="Galeria vazia"
      description="As fotos aparecem aqui assim que forem publicadas."
      class="mx-auto max-w-md"
    />

    <PublicPhotoGrid v-else :photos="photos" variant="full" />
  </PublicEditorialSection>
</template>
