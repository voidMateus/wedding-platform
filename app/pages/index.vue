<script setup lang="ts">
import { classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()

const { data: wedding, status: weddingStatus } = getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()

// Cerimônia/Recepção em destaque (Fase Editorial) reaproveitam os mesmos
// event_segments da Timeline — sem coluna de tipo estruturada, então só
// aparecem se o título do segmento bater com a heurística de palavra-chave
// (shared/utils/event-segment-keywords.ts). Sem correspondência, a seção
// simplesmente não aparece (nunca um estado vazio quebrado).
const ceremonySegment = computed(
  () => segmentsResponse.value?.data.find((s) => classifyEventSegmentTitle(s.title) === 'ceremony') ?? null,
)
const receptionSegment = computed(
  () => segmentsResponse.value?.data.find((s) => classifyEventSegmentTitle(s.title) === 'reception') ?? null,
)

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
      <PublicTimeline :segments="segmentsResponse?.data ?? []" />
      <PublicEventSpotlight v-if="ceremonySegment" id="cerimonia" :segment="ceremonySegment" />
      <PublicEventSpotlight
        v-if="receptionSegment"
        id="recepcao"
        :segment="receptionSegment"
        tone="muted"
      />
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
