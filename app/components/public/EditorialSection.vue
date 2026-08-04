<script setup lang="ts">
// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão usado nas demais seções públicas.
import { DEFAULT_SECTION_SPACING, SECTION_SPACING_CLASSES, type SectionSpacing } from '#shared/section-spacing'

interface Props {
  title?: string
  tone?: 'default' | 'muted' | 'accent'
  divider?: boolean
  id?: string
  /** Ritmo vertical da seção (CLAUDE.md, Fase Premium Experience) — default 'md' reproduz o padding usado desde a Fase Editorial. */
  spacing?: SectionSpacing
}

const { title, tone = 'default', divider = true, id, spacing = DEFAULT_SECTION_SPACING } = defineProps<Props>()

const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted',
  // Banda de destaque (ex: contagem regressiva) — mesmo tom já usado no
  // Hero sem foto de capa (bg-secondary/10), para marcar uma pausa/momento
  // na leitura sem introduzir uma cor nova.
  accent: 'bg-secondary/10',
}
</script>

<template>
  <section :id="id" class="px-4" :class="[TONE_CLASSES[tone], SECTION_SPACING_CLASSES[spacing]]">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto flex max-w-5xl flex-col gap-10"
    >
      <div v-if="title" class="flex flex-col items-center gap-3 text-center">
        <UiSectionDivider v-if="divider" />
        <h2 class="font-display text-3xl font-semibold text-heading sm:text-4xl">{{ title }}</h2>
      </div>
      <slot />
    </div>
  </section>
</template>
