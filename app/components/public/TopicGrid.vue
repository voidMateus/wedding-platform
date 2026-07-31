<script setup lang="ts">
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
      class="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-elevated p-5 shadow-sm"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/40 bg-surface-muted text-secondary"
      >
        <Icon :name="topic.icon" class="h-5 w-5" />
      </span>
      <p class="font-medium text-heading">{{ topic.title }}</p>
      <p class="text-sm leading-relaxed text-body">{{ topic.description }}</p>
    </div>
  </div>
</template>
