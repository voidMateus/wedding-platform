<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { AdminSearchResult } from '~/composables/useAdminSearch'

const SEARCH_MIN_CHARS = 2

const { search } = useAdminSearch()

const query = ref('')
const results = ref<AdminSearchResult[]>([])
const isOpen = ref(false)

const debouncedSearch = useDebounceFn(async (value: string) => {
  results.value = await search(value)
  isOpen.value = true
}, 250)

watch(query, (value) => {
  if (value.trim().length < SEARCH_MIN_CHARS) {
    results.value = []
    isOpen.value = false
    return
  }
  debouncedSearch(value.trim())
})

function handleSelect() {
  isOpen.value = false
  query.value = ''
}
</script>

<template>
  <div class="relative w-full max-w-sm">
    <UiInput v-model="query" placeholder="Buscar convidado, convite ou grupo..." @focus="isOpen = results.length > 0" />
    <ul
      v-if="isOpen && results.length"
      class="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface shadow-md"
    >
      <li v-for="result in results" :key="`${result.type}-${result.id}`">
        <NuxtLink
          :to="result.href"
          class="flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-surface-muted"
          @click="handleSelect"
        >
          <span>{{ result.label }}</span>
          <span class="text-xs text-text-muted">{{ result.sublabel }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
