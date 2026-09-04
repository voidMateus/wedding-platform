<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { PlaceSuggestion } from '~/types/place'

/**
 * Campo de autocomplete de lugares. Só a busca: o que fazer com a escolha é
 * decisão do pai (AdminLocationField, AdminLocationMapPicker).
 *
 * Sem `role="combobox"` de propósito. O padrão ARIA de combobox exige o role
 * no próprio `<input>` mais `aria-activedescendant`, e UiInput entrega os
 * atributos que caem nele à `<div>` externa (não tem `inheritAttrs: false`).
 * Marcar a div como combobox seria pior que não marcar — anunciaria ao leitor
 * de tela um controle que não se comporta como tal. No lugar, a lista é de
 * botões reais e a contagem de resultados é anunciada por região viva.
 */
interface Props {
  label?: string
  placeholder?: string
  /** Foco imediato — usado quando a busca abre por uma ação explícita ("Alterar local"). */
  autofocus?: boolean
}

const {
  label,
  placeholder = 'Busque pelo nome ou endereço',
  autofocus = false,
} = defineProps<Props>()

const emit = defineEmits<{
  select: [suggestion: PlaceSuggestion]
}>()

const { searchPlaces } = usePlaces()

const query = ref('')
const suggestions = ref<PlaceSuggestion[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
const errorMessage = ref<string | null>(null)
const activeIndex = ref(-1)

const rootEl = ref<HTMLElement | null>(null)

// 300ms: uma pausa natural de digitação. Cada disparo é uma requisição paga
// no provedor (server/utils/places-google.ts) — sem debounce, "Buffet Leila
// Malouf" custaria dezenove chamadas em vez de duas ou três.
const runSearch = useDebounceFn(async (value: string) => {
  isSearching.value = true
  errorMessage.value = null
  try {
    suggestions.value = await searchPlaces(value)
  } catch {
    // Nenhuma falha aqui é bloqueante: a lista fica vazia e o pai continua
    // oferecendo o cadastro manual, que não depende de provedor nenhum.
    suggestions.value = []
    errorMessage.value =
      'Não foi possível buscar agora. Você ainda pode cadastrar o local manualmente.'
  } finally {
    isSearching.value = false
    hasSearched.value = true
    activeIndex.value = -1
  }
}, 300)

watch(query, (value) => {
  const trimmed = value.trim()
  if (trimmed.length < MIN_PLACES_QUERY_LENGTH) {
    suggestions.value = []
    hasSearched.value = false
    errorMessage.value = null
    activeIndex.value = -1
    return
  }
  runSearch(trimmed)
})

/** Nenhum resultado nunca é erro — é o gatilho do caminho manual (CLAUDE.md, seção 12). */
const showEmptyState = computed(
  () =>
    hasSearched.value &&
    !isSearching.value &&
    suggestions.value.length === 0 &&
    !errorMessage.value,
)

const statusMessage = computed(() => {
  if (isSearching.value) return 'Buscando...'
  if (errorMessage.value) return errorMessage.value
  if (showEmptyState.value) return 'Nenhum local encontrado com esse nome.'
  if (suggestions.value.length === 1) return '1 local encontrado.'
  if (suggestions.value.length > 1) return `${suggestions.value.length} locais encontrados.`
  return ''
})

function choose(suggestion: PlaceSuggestion): void {
  emit('select', suggestion)
  query.value = ''
  suggestions.value = []
  hasSearched.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (!suggestions.value.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
    return
  }
  if (event.key === 'Enter') {
    const active = suggestions.value[activeIndex.value]
    if (active) {
      event.preventDefault()
      choose(active)
    }
    return
  }
  if (event.key === 'Escape') {
    suggestions.value = []
    activeIndex.value = -1
  }
}

onMounted(() => {
  if (autofocus) rootEl.value?.querySelector('input')?.focus()
})
</script>

<template>
  <div ref="rootEl" class="relative flex flex-col gap-2">
    <UiInput
      v-model="query"
      :label="label"
      :placeholder="placeholder"
      icon="lucide:search"
      @keydown="onKeydown"
    />

    <ul
      v-if="suggestions.length"
      class="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-md"
    >
      <li v-for="(suggestion, index) in suggestions" :key="suggestion.placeId">
        <button
          type="button"
          class="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          :class="index === activeIndex && 'bg-surface-muted'"
          @click="choose(suggestion)"
        >
          <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-text">
              {{ suggestion.mainText }}
            </span>
            <span v-if="suggestion.secondaryText" class="block truncate text-xs text-text-muted">
              {{ suggestion.secondaryText }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p v-if="statusMessage" class="text-xs text-text-muted" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>
