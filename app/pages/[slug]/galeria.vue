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
    <div class="-mt-4 mb-4 flex justify-center">
      <NuxtLink
        :to="`/${slug}`"
        class="inline-flex min-h-11 items-center gap-1.5 text-sm text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
        Voltar ao site
      </NuxtLink>
    </div>

    <div
      v-if="status === 'pending'"
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      <UiSkeleton v-for="n in 10" :key="n" class="aspect-square w-full rounded-lg" />
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
