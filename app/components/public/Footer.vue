<script setup lang="ts">
interface Props {
  coupleNames?: string | null
}

const { coupleNames } = defineProps<Props>()

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-border px-4 py-8 text-center text-sm text-text-muted">
    <p v-if="coupleNames">{{ coupleNames }} — {{ year }}</p>
    <p class="mt-1">Feito com Wedding Platform</p>
  </footer>
</template>
