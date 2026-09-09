<script setup lang="ts">
import {
  EVENT_SEGMENT_ICONS,
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

function iconFor(segment: EventSegment): string {
  return EVENT_SEGMENT_ICONS[classifyEventSegmentTitle(segment.titulo)]
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
  <!-- Borda em vez de sombra: no protótipo do convite todo cartão é um retângulo
       de traço fino sobre papel, sem elevação — a sombra dava a ele um peso de
       interface que a página não tem em nenhum outro lugar. -->
  <div
    class="flex w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-surface-elevated"
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

    <div class="flex flex-col gap-5 p-8">
      <!--
        O nome da etapa é o título do cartão, num ícone em disco e em corpo de
        display — como no protótipo. Antes era uma cápsula em caixa alta acima
        do local, e o cartão acabava com dois títulos disputando: "CERIMÔNIA"
        na cápsula e o nome do buffet logo abaixo, em serifada maior.
      -->
      <div v-for="segment in segments" :key="segment.id" class="flex flex-col gap-2">
        <span
          class="flex h-11 w-11 items-center justify-center rounded-full bg-ornament/15 text-ornament"
        >
          <Icon :name="iconFor(segment)" class="h-5 w-5" />
        </span>
        <h3 class="font-display text-2xl text-heading">{{ segment.titulo }}</h3>
        <p v-if="timeRangeFor(segment)" class="flex items-center gap-2 text-sm text-text-muted">
          <Icon name="lucide:clock" class="h-4 w-4 shrink-0 text-ornament" aria-hidden="true" />
          {{ timeRangeFor(segment) }}
        </p>
      </div>

      <p
        v-if="primary.nome_local || primary.endereco_local"
        class="flex items-start gap-2 text-sm text-text-muted"
      >
        <Icon
          name="lucide:map-pin"
          class="mt-0.5 h-4 w-4 shrink-0 text-ornament"
          aria-hidden="true"
        />
        <span>
          <span v-if="primary.nome_local" class="block text-heading">{{ primary.nome_local }}</span>
          {{ primary.endereco_local }}
        </span>
      </p>

      <UiVenueMap
        v-if="locationQuery"
        :query="locationQuery"
        :label="primary.nome_local || sectionTitle"
      />

      <!-- Link sublinhado, não botão: o protótipo trata "Ver no mapa" como uma
           saída discreta do cartão, e um segundo botão em cápsula competiria
           com o CTA de confirmar presença logo abaixo na página. -->
      <a
        v-if="externalMapsUrl"
        :href="externalMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-h-11 items-center gap-1.5 self-start text-xs uppercase tracking-[0.2em] text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Ver no mapa
        <Icon name="lucide:external-link" class="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  </div>
</template>
