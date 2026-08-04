<script setup lang="ts">
import { computeGiftPriceBrackets } from '#shared/utils/gift-price-brackets'
import { effectiveGiftPriceCents, filterAndSortGifts } from '#shared/utils/filter-gifts'

interface Props {
  code?: string
}

const { code } = defineProps<Props>()

const { getPublicGifts, reserveGift, contributeToGift, cancelGift } = usePublicGifts(code)
const { data, status, refresh } = getPublicGifts()
const toast = useToast()

interface ApiError {
  statusCode?: number
}

function isConflict(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as ApiError).statusCode === 409
}

// Filtro por categoria (Fase Visual) — client-side, sem novo request: a
// vitrine já retorna categoryName por presente. null = "Todas".
const selectedCategory = ref<string | null>(null)
const selectedPriceBracket = ref<string | null>(null)
const sortBy = ref<string>('default')

const categories = computed(() => {
  const names = new Set<string>()
  for (const gift of data.value?.data ?? []) {
    if (gift.categoryName) names.add(gift.categoryName)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const priceBrackets = computed(() => {
  const prices = (data.value?.data ?? [])
    .map((gift) => effectiveGiftPriceCents(gift))
    .filter((price): price is number => price !== null)
  return computeGiftPriceBrackets(prices)
})

const filteredGifts = computed(() => {
  const bracket = selectedPriceBracket.value
    ? (priceBrackets.value.find((b) => b.id === selectedPriceBracket.value) ?? null)
    : null

  return filterAndSortGifts(data.value?.data ?? [], {
    category: selectedCategory.value,
    priceRange: bracket ? { min: bracket.min, max: bracket.max } : null,
    sortBy: sortBy.value,
  })
})

async function handleReserve(giftId: string) {
  try {
    await reserveGift(giftId)
    toast.success('Presente reservado! Obrigado.')
    await refresh()
  } catch (err) {
    toast.error(
      isConflict(err)
        ? 'Esse presente acabou de ser reservado por outra pessoa.'
        : 'Não foi possível reservar. Tente novamente.',
    )
  }
}

async function handleCancel(giftId: string) {
  try {
    await cancelGift(giftId)
    toast.success('Cancelado.')
    await refresh()
  } catch {
    toast.error('Não foi possível cancelar. Tente novamente.')
  }
}

async function handleContribute(giftId: string, amountCents: number) {
  try {
    await contributeToGift(giftId, amountCents)
    toast.success('Contribuição registrada! Obrigado.')
    await refresh()
  } catch {
    toast.error('Não foi possível registrar a contribuição. Tente novamente.')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="status === 'pending'" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <UiSkeleton v-for="n in 6" :key="n" class="h-72 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum presente cadastrado ainda"
      description="Volte em breve para conferir a lista."
    />

    <template v-else>
      <div class="flex flex-col gap-3">
        <div v-if="categories.length" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="
              selectedCategory === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-text-muted hover:border-primary/50'
            "
            @click="selectedCategory = null"
          >
            Todas
          </button>
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="
              selectedCategory === category
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-text-muted hover:border-primary/50'
            "
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </div>

        <div v-if="priceBrackets.length" class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="
              selectedPriceBracket === null
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-text-muted hover:border-primary/50'
            "
            @click="selectedPriceBracket = null"
          >
            Todos
          </button>
          <button
            v-for="bracket in priceBrackets"
            :key="bracket.id"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="
              selectedPriceBracket === bracket.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-text-muted hover:border-primary/50'
            "
            @click="selectedPriceBracket = bracket.id"
          >
            {{ bracket.label }}
          </button>
        </div>

        <UiSelect
          v-model="sortBy"
          label="Ordenar por"
          class="max-w-xs"
          :options="[
            { value: 'default', label: 'Ordem do casal' },
            { value: 'price-asc', label: 'Menor preço' },
            { value: 'price-desc', label: 'Maior preço' },
          ]"
        />
      </div>

      <p class="text-sm text-text-muted">
        Mostrando {{ filteredGifts.length }} de {{ data.data.length }} presentes
      </p>

      <UiEmptyState
        v-if="!filteredGifts.length"
        title="Nenhum presente nesse filtro"
        description="Escolha outro filtro ou veja todos os presentes."
      />
      <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <GiftsGiftCard
          v-for="gift in filteredGifts"
          :key="gift.id"
          :gift="gift"
          :has-code="Boolean(code)"
          @reserve="handleReserve(gift.id)"
          @cancel="handleCancel(gift.id)"
          @contribute="(amountCents) => handleContribute(gift.id, amountCents)"
        />
      </div>
    </template>
  </div>
</template>
