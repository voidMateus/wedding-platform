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
  <div class="flex justify-center bg-surface-muted px-4 pb-10">
    <div
      class="flex items-center gap-3 rounded-xl border border-primary/10 bg-surface-elevated px-6 py-4 shadow-xl"
    >
      <Icon name="lucide:calendar-heart" class="h-5 w-5 text-primary" />
      <div class="text-left">
        <p class="text-xs font-medium tracking-[0.25em] text-primary/60 uppercase">Save the date</p>
        <p class="font-display text-base font-semibold text-heading">{{ formattedDate }}</p>
      </div>
    </div>
  </div>
</template>
