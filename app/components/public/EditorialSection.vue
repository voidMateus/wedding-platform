<script setup lang="ts">
// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão já usado em Timeline.vue.
interface Props {
  title?: string
  tone?: 'default' | 'muted'
  divider?: boolean
  id?: string
}

const { title, tone = 'default', divider = true, id } = defineProps<Props>()
</script>

<template>
  <section
    :id="id"
    class="px-4 py-20 sm:py-28"
    :class="tone === 'muted' ? 'bg-surface-muted' : 'bg-surface'"
  >
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
