<script setup lang="ts">
import { filterAndSortGifts, segmentGifts } from '#shared/utils/filter-gifts'

const { getPublicGifts, reserveGift, createCheckout } = usePublicGifts()
const { data, status, refresh } = getPublicGifts()
const toast = useToast()
const identity = useGiftGiverIdentity()

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isConflict(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as ApiError).statusCode === 409
}

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const message = (err as ApiError).data?.message
    if (message) return message
  }
  return fallback
}

const segments = computed(() => segmentGifts(data.value?.data ?? []))
const hasPixOption = computed(() => data.value?.data[0]?.hasPixOption ?? false)

// Filtro por categoria só se aplica à Lista de Presentes física (CLAUDE.md,
// "Presentes 2.0") — Contribuições/Emocionais são listas curtas por
// natureza, sem necessidade de filtro. Filtro por faixa de preço foi
// removido (pedido do usuário) — só a ordenação por preço permanece.
const selectedCategory = ref<string | null>(null)
const sortBy = ref<string>('default')

const categories = computed(() => {
  const names = new Set<string>()
  for (const gift of segments.value.physical) {
    if (gift.categoryName) names.add(gift.categoryName)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const filteredPhysicalGifts = computed(() =>
  filterAndSortGifts(segments.value.physical, {
    category: selectedCategory.value,
    sortBy: sortBy.value,
  }),
)

async function handleReserve(giftId: string, message: string) {
  try {
    await reserveGift(giftId, { name: identity.value.name, phone: identity.value.phone }, message)
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

async function handleCheckout(
  giftId: string,
  payload: { amountCents?: number; quotaCount?: number; message: string },
) {
  try {
    const { checkoutUrl } = await createCheckout(
      giftId,
      { name: identity.value.name, phone: identity.value.phone },
      payload,
    )
    window.location.href = checkoutUrl
  } catch (err) {
    toast.error(
      isConflict(err)
        ? 'Esse presente acabou de ser reservado por outra pessoa.'
        : errorMessage(err, 'Não foi possível iniciar o pagamento. Tente novamente.'),
    )
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
      <section id="presentes-fisicos" class="flex flex-col gap-4">
        <h2 class="font-display text-xl font-semibold text-heading">Lista de Presentes</h2>

        <div v-if="!filteredPhysicalGifts.length && !categories.length" class="text-sm text-text-muted">
          Nenhum presente físico cadastrado ainda.
        </div>
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
            Mostrando {{ filteredPhysicalGifts.length }} de {{ segments.physical.length }} presentes
          </p>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <GiftsGiftCard
              v-for="gift in filteredPhysicalGifts"
              :key="gift.id"
              :gift="gift"
              @reserve="(message) => handleReserve(gift.id, message)"
              @checkout="(payload) => handleCheckout(gift.id, payload)"
            />
          </div>
        </template>
      </section>

      <section v-if="segments.contributions.length" id="presentes-contribuicoes" class="flex flex-col gap-4">
        <h2 class="font-display text-xl font-semibold text-heading">Contribuições</h2>
        <p v-if="!hasPixOption" class="text-sm text-text-muted">
          O casal ainda não ativou pagamento online — contribuições ficam disponíveis assim que
          isso for configurado.
        </p>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <GiftsGiftCard
            v-for="gift in segments.contributions"
            :key="gift.id"
            :gift="gift"
            @checkout="(payload) => handleCheckout(gift.id, payload)"
          />
        </div>
      </section>

      <section v-if="segments.emotional.length" id="presentes-emocionais" class="flex flex-col gap-4">
        <h2 class="font-display text-xl font-semibold text-heading">Presentes Emocionais</h2>
        <p v-if="!hasPixOption" class="text-sm text-text-muted">
          O casal ainda não ativou pagamento online — esses presentes ficam disponíveis assim que
          isso for configurado.
        </p>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <GiftsGiftCard
            v-for="gift in segments.emotional"
            :key="gift.id"
            :gift="gift"
            @checkout="(payload) => handleCheckout(gift.id, payload)"
          />
        </div>
      </section>
    </template>
  </div>
</template>
