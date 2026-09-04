<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core'
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

// Atalho ⌘K / Ctrl+K — o chip no campo só existe porque o atalho existe de
// verdade. O input real vive dentro de UiInput (que não expõe ref próprio),
// então é alcançado pelo elemento raiz em vez de por uma nova prop no
// componente de UI.
const rootEl = ref<HTMLElement | null>(null)
const shortcutLabel = ref('Ctrl K')

function focusInput(): void {
  rootEl.value?.querySelector('input')?.focus()
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    focusInput()
    return
  }
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
})

onMounted(() => {
  if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) {
    shortcutLabel.value = '⌘K'
  }
})
</script>

<template>
  <div ref="rootEl" class="relative min-w-0 flex-1 md:max-w-md">
    <UiInput
      v-model="query"
      icon="lucide:search"
      tone="muted"
      placeholder="Buscar convidado, convite ou grupo..."
      @focus="isOpen = results.length > 0"
    />
    <ClientOnly>
      <span
        v-if="!query"
        class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-xs font-medium text-text-muted sm:block"
        aria-hidden="true"
      >
        {{ shortcutLabel }}
      </span>
    </ClientOnly>
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
