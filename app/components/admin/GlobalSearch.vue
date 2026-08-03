<script setup lang="ts">
interface SearchResult {
  type: 'guest' | 'invite' | 'group'
  id: string
  label: string
  sublabel: string | null
  href: string
}

const query = ref('')
const results = ref<SearchResult[]>([])
const isOpen = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(searchTimeout)
  if (value.trim().length < 2) {
    results.value = []
    isOpen.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    const response = await $fetch<{ data: SearchResult[] }>('/api/admin/search', {
      query: { q: value.trim() },
    })
    results.value = response.data
    isOpen.value = true
  }, 250)
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
