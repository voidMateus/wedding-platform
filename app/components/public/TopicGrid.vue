<script setup lang="ts">
// Cartões do Manual dos Convidados, no mesmo molde dos marcos de "Nossa
// História" e das sugestões de dress code: borda fina sem sombra, ícone em
// disco dourado, título em display. Os três eram variações do mesmo cartão com
// bordas e sombras diferentes — o site tem um cartão só.
import type { ManualTopic } from '#shared/wedding-content'

interface Props {
  topics: ManualTopic[]
}

defineProps<Props>()
</script>

<template>
  <div class="grid gap-6 sm:grid-cols-2">
    <div
      v-for="topic in topics"
      :key="topic.title"
      class="flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-surface-elevated p-6"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-full bg-ornament/15 text-ornament"
      >
        <Icon :name="topic.icon" class="h-5 w-5" />
      </span>
      <p class="font-display text-lg text-heading">{{ topic.title }}</p>
      <p class="text-sm leading-relaxed text-text-muted">{{ topic.description }}</p>
    </div>
  </div>
</template>
