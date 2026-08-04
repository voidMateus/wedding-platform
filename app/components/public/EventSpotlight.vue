<script setup lang="ts">
import { classifyEventSegmentTitle, anchorForEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  /**
   * Um ou mais segmentos que compartilham o mesmo local (CLAUDE.md, §12.2 —
   * `same_venue_as`). O primeiro item é sempre o segmento "fonte" (dono dos
   * dados de local/mapa); os demais são renderizados como momentos extras
   * dentro do mesmo card, em vez de duplicar endereço/mapa.
   */
  segments: EventSegment[]
  tone?: 'default' | 'muted'
}

const { segments, tone = 'default' } = defineProps<Props>()

const primary = computed(() => segments[0]!)

// Só decide o texto do badge (ex.: "CERIMÔNIA") — sem coluna de tipo
// estruturada em event_segments (CLAUDE.md, seção 12), itens fora da
// classificação (chá de panela, coquetel...) caem no próprio título.
function badgeLabelFor(segment: EventSegment): string {
  const kind = classifyEventSegmentTitle(segment.title)
  return kind === 'other' ? segment.title : segment.title.toUpperCase()
}

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function timeRangeFor(segment: EventSegment): string | null {
  const start = formatTime(segment.starts_at)
  const end = formatTime(segment.ends_at)
  if (start && end) return `${start} – ${end}`
  return start
}

// Título da seção: junta os títulos de todos os momentos do grupo (ex.:
// "Cerimônia e Recepção") — para um grupo de um único segmento, é só o
// próprio título, mesmo comportamento de antes.
const sectionTitle = computed(() => {
  const titles = segments.map((segment) => segment.title)
  if (titles.length <= 1) return titles[0] ?? ''
  return `${titles.slice(0, -1).join(', ')} e ${titles[titles.length - 1]}`
})

// Âncoras de navegação (usadas por PublicNavBar): quando dois momentos
// fundidos têm âncora própria (ex.: Cerimônia e Recepção), a primeira vira o
// id da própria seção e as demais viram âncoras internas ocultas, para que
// nenhum link do menu leve a lugar nenhum.
const anchorIds = computed(() => {
  const seen = new Set<string>()
  for (const segment of segments) {
    const anchor = anchorForEventSegmentTitle(segment.title)
    if (anchor) seen.add(anchor)
  }
  return [...seen]
})
const sectionId = computed(() => anchorIds.value[0])
const secondaryAnchorIds = computed(() => anchorIds.value.slice(1))

// Coordenadas são só um reforço de precisão — na maioria dos casos o
// próprio endereço em texto já geocodifica bem no embed do Google Maps
// (CLAUDE.md, seção 3). Preferidas quando existem, senão cai para o
// endereço; sem nenhum dos dois, nem mapa nem botão aparecem. Sem foto do
// local no card (event_segments não tem coluna de imagem — fora do escopo
// "só front" do redesign de referência, CLAUDE.md "Fase Vermelho Clássico").
const locationQuery = computed(() => {
  const segment = primary.value
  if (segment.venue_latitude !== null && segment.venue_longitude !== null) {
    return `${segment.venue_latitude},${segment.venue_longitude}`
  }
  const address = [segment.venue_name, segment.venue_address].filter(Boolean).join(', ')
  return address || null
})

const externalMapsUrl = computed(() =>
  locationQuery.value
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery.value)}`
    : null,
)
</script>

<template>
  <PublicEditorialSection :id="sectionId" :title="sectionTitle" :tone="tone">
    <span v-for="anchorId in secondaryAnchorIds" :id="anchorId" :key="anchorId" aria-hidden="true" class="sr-only" />
    <div
      class="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg border border-border bg-surface-elevated p-6 shadow-md"
    >
      <div v-for="segment in segments" :key="segment.id" class="flex flex-col gap-1">
        <span
          class="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
        >
          {{ badgeLabelFor(segment) }}
        </span>
        <p v-if="timeRangeFor(segment)" class="text-sm font-medium text-text-muted">{{ timeRangeFor(segment) }}</p>
      </div>

      <div v-if="primary.venue_name || primary.venue_address" class="flex flex-col gap-1">
        <h3 v-if="primary.venue_name" class="font-display text-2xl font-semibold text-heading">
          {{ primary.venue_name }}
        </h3>
        <p v-if="primary.venue_address" class="flex items-start gap-1.5 text-sm text-text-muted">
          <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ primary.venue_address }}
        </p>
      </div>

      <PublicVenueMap v-if="locationQuery" :query="locationQuery" :label="primary.venue_name || sectionTitle" />

      <UiButton
        v-if="externalMapsUrl"
        variant="outline"
        rounded="full"
        size="sm"
        class="self-start"
        :to="externalMapsUrl"
        target="_blank"
      >
        <Icon name="lucide:external-link" class="h-4 w-4" />
        Abrir no Google Maps
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
