<script setup lang="ts">
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <section class="flex flex-col items-center gap-4 px-4 py-20 text-center">
    <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
    <h1 class="font-serif text-4xl font-semibold text-text sm:text-5xl">
      {{ wedding.couple_names }}
    </h1>
    <p class="text-lg text-text-muted">{{ formattedDate }}</p>
  </section>
</template>
