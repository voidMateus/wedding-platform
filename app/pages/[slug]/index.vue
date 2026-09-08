<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveHomeSectionOrder } from '#shared/home-sections'
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()

const { data: wedding, status: weddingStatus } = getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()

// Repassado a Hero como prop (em vez de useRoute() direto) — mantém o
// componente testável com @vue/test-utils puro. Presentes não usa mais
// token de convite (CLAUDE.md §18.2/4.5), então GiftsShowcaseSection não
// precisa mais deste valor.
const route = useRoute()
const code = computed(() => (typeof route.query.code === 'string' ? route.query.code : undefined))

// Todo item do cronograma alimenta a seção única "O Grande Dia"
// (GrandeDiaSection) — substitui a antiga lista "Programação" e a versão
// anterior com uma seção própria por item (feedback de produto: nome fixo
// e previsível é melhor que título dinâmico por segmento). A classificação
// por palavra-chave (shared/utils/event-segment-keywords.ts) só decide o
// ícone/badge de cada card e as âncoras internas de compatibilidade
// (#cerimonia/#recepcao).
const resolvedSegments = computed(() => {
  const segments = segmentsResponse.value?.data ?? []
  return segments.map((segment) => resolveEventSegmentVenue(segment, segments))
})

// Cerimônia/Recepção no mesmo endereço viram um único card dentro de "O
// Grande Dia" (CLAUDE.md, §12.2) — sem duplicar mapa/endereço; endereços
// diferentes viram dois cards lado a lado na mesma seção.
const eventSegmentGroups = computed(() => groupEventSegmentsByVenue(resolvedSegments.value))

// Ordem dos capítulos escolhida pelo casal (config_tema.sectionOrder — Fase
// Rebrand do Convite). O `v-for` sobre ids com um `v-if` por seção substitui
// a lista fixa de componentes que existia aqui: é a mesma leitura de cima
// para baixo, mas a sequência passa a vir do banco.
//
// `<component :is>` seria mais curto e foi descartado de propósito: cada
// seção recebe props diferentes, então um mapa id → componente precisaria
// vir acompanhado de um mapa id → props para não perder a tipagem — mais
// indireção para ler exatamente a mesma coisa.
const sectionOrder = computed(() => {
  const theme = (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>
  return resolveHomeSectionOrder(theme.sectionOrder)
})

// Meta dinâmica por casamento (CLAUDE.md, seção 26) — essencial para o
// preview correto ao compartilhar o link no WhatsApp. Slug inexistente
// nunca deve ser indexado (não há conteúdo real por trás dele).
useSeoMeta({
  title: () =>
    wedding.value ? `${wedding.value.nomes_noivos} — Casamento` : 'Casamento não encontrado',
  description: () =>
    wedding.value ? `Confira as informações do nosso casamento e confirme presença.` : undefined,
  ogTitle: () => (wedding.value ? `${wedding.value.nomes_noivos} — Casamento` : undefined),
  robots: () => (wedding.value ? undefined : 'noindex, nofollow'),
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
      title="Casamento não encontrado"
      description="Confira se o link está correto — o endereço deve terminar com o nome do casal."
      class="mx-auto max-w-md px-4 py-20"
    />

    <template v-else>
      <!-- O Hero é a capa, não um capítulo: fica fora da ordem configurável. -->
      <PublicHero :wedding="wedding" :segments="resolvedSegments" :code="code" />

      <template v-for="sectionId in sectionOrder" :key="sectionId">
        <PublicWelcomeSection v-if="sectionId === 'boas-vindas'" :wedding="wedding" />
        <PublicVerseSection v-else-if="sectionId === 'versiculo'" :wedding="wedding" />
        <PublicStorySection v-else-if="sectionId === 'historia'" :wedding="wedding" />
        <PublicGrandeDiaSection
          v-else-if="sectionId === 'grande-dia'"
          :groups="eventSegmentGroups"
          :event-date="wedding.data_evento"
        />
        <PublicRsvpTeaserSection
          v-else-if="sectionId === 'confirmar-presenca'"
          :wedding="wedding"
        />
        <PublicDressCodeSection v-else-if="sectionId === 'dress-code'" :wedding="wedding" />
        <PublicGuestManualSection
          v-else-if="sectionId === 'manual-convidados'"
          :wedding="wedding"
        />
        <PublicGroomsmenManualSection
          v-else-if="sectionId === 'manual-padrinhos'"
          :wedding="wedding"
        />
        <PublicGiftsShowcaseSection v-else-if="sectionId === 'presentes'" />
        <PublicGallerySection v-else-if="sectionId === 'nossos-momentos'" />
        <PublicFaqSection v-else-if="sectionId === 'faq'" :wedding="wedding" />
      </template>
    </template>
  </div>
</template>
