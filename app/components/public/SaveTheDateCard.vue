<script setup lang="ts">
// Mini-cartão "Save the date" logo acima dos cards de local do cronograma
// (redesign de referência — CLAUDE.md, "Fase Vermelho Clássico"). Puramente
// decorativo/informativo, sem âncora própria — a data já aparece na linha
// de subtítulo do Hero.
interface Props {
  eventDate: string
}

const { eventDate } = defineProps<Props>()

const formattedDate = computed(() =>
  new Date(`${eventDate}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <div class="flex justify-center bg-surface px-4 py-8">
    <div
      class="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-5 py-3 shadow-sm"
    >
      <Icon name="lucide:calendar-heart" class="h-5 w-5 text-primary" />
      <div class="text-left">
        <p class="text-xs uppercase tracking-wide text-text-muted">Save the date</p>
        <p class="font-display text-base font-semibold text-heading">{{ formattedDate }}</p>
      </div>
    </div>
  </div>
</template>
