<script setup lang="ts">
interface Props {
  icon: string
  label: string
  to: string
}

defineProps<Props>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4 shadow-sm transition-brand hover:border-primary/20 hover:shadow-md"
  >
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-brand group-hover:bg-primary group-hover:text-primary-foreground"
    >
      <Icon :name="icon" class="h-5 w-5" />
    </span>
    <span class="text-sm font-medium text-text">{{ label }}</span>
  </NuxtLink>
</template>
