<script setup lang="ts">
import {
  anchorForEventSegmentTitle,
  classifyEventSegmentTitle,
} from '#shared/utils/event-segment-keywords'
import { montarConsultaEmbedMapa, montarUrlMapa } from '#shared/utils/mapa-local'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  /** Um ou mais segmentos que compartilham local (CLAUDE.md, §12.2) — o primeiro é sempre o dono dos dados de local/mapa. */
  segments: EventSegment[]
}

const { segments } = defineProps<Props>()

const primary = computed(() => segments[0]!)

function badgeLabelFor(segment: EventSegment): string {
  const kind = classifyEventSegmentTitle(segment.titulo)
  return kind === 'other' ? segment.titulo : segment.titulo.toUpperCase()
}

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function timeRangeFor(segment: EventSegment): string | null {
  const start = formatTime(segment.inicia_em)
  const end = formatTime(segment.termina_em)
  if (start && end) return `${start} – ${end}`
  return start
}

const sectionTitle = computed(() => segments.map((s) => s.titulo).join(' e '))

// Âncoras internas (#cerimonia/#recepcao) — mantidas para compatibilidade
// com links diretos já compartilhados, mesmo que o card não seja mais uma
// seção própria (agora vive dentro de "O Grande Dia", ver GrandeDiaSection).
const anchorIds = computed(() => {
  const seen = new Set<string>()
  for (const segment of segments) {
    const anchor = anchorForEventSegmentTitle(segment.titulo)
    if (anchor) seen.add(anchor)
  }
  return [...seen]
})

// Embed e link externo divergem de propósito: o iframe keyless só entende
// coordenadas ou texto, enquanto "Abrir no Google Maps" prefere o place_id —
// abrir o lugar exato que o casal escolheu, sem refazer busca por endereço
// (CLAUDE.md, seção 12). Ambas as regras vivem em shared/utils/mapa-local.ts.
const locationQuery = computed(() => montarConsultaEmbedMapa(primary.value))

const externalMapsUrl = computed(() => montarUrlMapa(primary.value))
</script>

<template>
  <div
    class="flex w-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-elevated shadow-xl"
  >
    <span
      v-for="anchorId in anchorIds"
      :id="anchorId"
      :key="anchorId"
      aria-hidden="true"
      class="sr-only"
    />

    <NuxtImg
      v-if="primary.url_imagem"
      :src="primary.url_imagem"
      :alt="primary.nome_local || sectionTitle"
      class="aspect-video w-full object-cover"
      sizes="sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw"
      loading="lazy"
    />

    <div class="flex flex-col gap-4 p-7">
      <div v-for="segment in segments" :key="segment.id" class="flex flex-col gap-1">
        <span
          class="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
        >
          {{ badgeLabelFor(segment) }}
        </span>
        <p v-if="timeRangeFor(segment)" class="text-sm font-medium text-text-muted">
          {{ timeRangeFor(segment) }}
        </p>
      </div>

      <div v-if="primary.nome_local || primary.endereco_local" class="flex flex-col gap-1">
        <h3 v-if="primary.nome_local" class="font-display text-2xl font-semibold text-heading">
          {{ primary.nome_local }}
        </h3>
        <p v-if="primary.endereco_local" class="flex items-start gap-1.5 text-sm text-text-muted">
          <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ primary.endereco_local }}
        </p>
      </div>

      <UiVenueMap
        v-if="locationQuery"
        :query="locationQuery"
        :label="primary.nome_local || sectionTitle"
      />

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
  </div>
</template>
