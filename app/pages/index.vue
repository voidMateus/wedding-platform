<script setup lang="ts">
import { classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()

const { data: wedding, status: weddingStatus } = getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()

// Cada item do cronograma vira sua própria seção em destaque — substitui a
// antiga lista "Programação", redundante com estas seções quando só há
// Cerimônia/Recepção (feedback de produto: ter as duas era duplicar a mesma
// informação). A classificação por palavra-chave
// (shared/utils/event-segment-keywords.ts) só decide o ícone e, para
// Cerimônia/Recepção especificamente, uma âncora fixa (compatibilidade com
// links já compartilhados) — todo segmento aparece aqui, não só os dois
// classificados, o que também cobre casamentos com mais etapas (ex.: chá de
// panela, coquetel).
const resolvedSegments = computed(() => {
  const segments = segmentsResponse.value?.data ?? []
  return segments.map((segment) => resolveEventSegmentVenue(segment, segments))
})

function anchorFor(title: string): string | undefined {
  const type = classifyEventSegmentTitle(title)
  if (type === 'ceremony') return 'cerimonia'
  if (type === 'reception') return 'recepcao'
  return undefined
}

// Meta dinâmica por casamento (CLAUDE.md, seção 26) — essencial para o
// preview correto ao compartilhar o link no WhatsApp.
useSeoMeta({
  title: () => (wedding.value ? `${wedding.value.couple_names} — Casamento` : 'Wedding Platform'),
  description: () =>
    wedding.value
      ? `Confira as informações do nosso casamento e confirme presença.`
      : undefined,
  ogTitle: () => (wedding.value ? `${wedding.value.couple_names} — Casamento` : undefined),
})
</script>

<template>
  <div>
    <div v-if="weddingStatus === 'pending'" class="flex flex-col items-center gap-4 px-4 py-20">
      <UiSkeleton class="h-10 w-64" />
      <UiSkeleton class="h-6 w-40" />
    </div>

    <UiEmptyState
      v-else-if="!wedding"
      title="Não foi possível carregar o casamento"
      description="Tente novamente em instantes."
      class="mx-auto max-w-md px-4 py-20"
    />

    <template v-else>
      <PublicHero :wedding="wedding" />
      <PublicStorySection :wedding="wedding" />
      <PublicCountdownSection :wedding="wedding" />
      <div id="cronograma">
        <PublicEventSpotlight
          v-for="(segment, index) in resolvedSegments"
          :id="anchorFor(segment.title)"
          :key="segment.id"
          :segment="segment"
          :tone="index % 2 === 0 ? 'default' : 'muted'"
        />
      </div>
      <PublicDressCodeSection :wedding="wedding" />
      <PublicGuestManualSection />
      <PublicGroomsmenManualSection />
      <PublicGiftsTeaserSection />
      <PublicRsvpTeaserSection />
      <PublicGallerySection />
      <PublicFaqSection />
      <PublicContactSection />
    </template>
  </div>
</template>
