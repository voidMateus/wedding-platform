<script setup lang="ts">
interface Props {
  coupleNames?: string | null
}

const { coupleNames } = defineProps<Props>()
</script>

<template>
  <header class="border-b border-border bg-surface/80 backdrop-blur">
    <nav class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="font-display text-lg font-semibold text-text">
        {{ coupleNames || 'Wedding Platform' }}
      </NuxtLink>
      <div class="flex gap-4 text-sm text-text-muted">
        <NuxtLink to="/" class="hover:text-text">Início</NuxtLink>
        <NuxtLink to="/presentes" class="hover:text-text">Presentes</NuxtLink>
      </div>
    </nav>
  </header>
</template>
