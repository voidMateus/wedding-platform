<script setup lang="ts">
// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão usado nas demais seções públicas.
interface Props {
  title?: string
  /** Rótulo curto acima do título (ex.: "R.S.V.P", "Com carinho") — mesmo padrão de cabeçalho em toda seção pública (referência de estilo: mimodocasal.com.br). */
  eyebrow?: string
  tone?: 'default' | 'muted' | 'accent'
  divider?: boolean
  id?: string
}

const { title, eyebrow, tone = 'default', divider = true, id } = defineProps<Props>()

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
  <section :id="id" class="px-4 py-20 sm:py-28" :class="TONE_CLASSES[tone]">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto flex max-w-5xl flex-col gap-10"
    >
      <div v-if="title" class="flex flex-col items-center gap-3 text-center">
        <p v-if="eyebrow" class="text-xs font-medium tracking-[0.3em] text-primary/60 uppercase">{{ eyebrow }}</p>
        <h2 class="font-display text-3xl font-semibold text-heading sm:text-4xl">{{ title }}</h2>
        <UiSectionDivider v-if="divider" />
      </div>
      <slot />
    </div>
  </section>
</template>
