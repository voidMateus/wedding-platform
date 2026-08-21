<script setup lang="ts">
import { filterAndSortGifts, segmentGifts } from '#shared/utils/filter-gifts'
import { getApiErrorMessage, isApiError } from '~/utils/api-error'

const { getPublicGifts, reserveGift, createCheckout } = usePublicGifts()
const { data, status, error, refresh } = getPublicGifts()
const toast = useToast()
const identity = useGiftGiverIdentity()

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

function isConflict(err: unknown): boolean {
  return isApiError(err) && err.statusCode === 409
}

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
        : getApiErrorMessage(err, 'Não foi possível iniciar o pagamento. Tente novamente.'),
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
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar os presentes"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum presente cadastrado ainda"
      description="Volte em breve para conferir a lista."
    />

    <template v-else>
      <section id="presentes-fisicos" class="flex flex-col gap-4">
        <h2 class="font-display text-xl font-semibold text-heading">Lista de Presentes</h2>

        <div
          v-if="!filteredPhysicalGifts.length && !categories.length"
          class="text-sm text-text-muted"
        >
          Nenhum presente físico cadastrado ainda.
        </div>
        <template v-else>
          <div class="flex flex-col gap-3">
            <div v-if="categories.length" class="flex flex-wrap gap-2">
              <UiChip
                label="Todas"
                clickable
                :selected="selectedCategory === null"
                @click="selectedCategory = null"
              />
              <UiChip
                v-for="category in categories"
                :key="category"
                :label="category"
                clickable
                :selected="selectedCategory === category"
                @click="selectedCategory = category"
              />
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

      <section
        v-if="segments.contributions.length"
        id="presentes-contribuicoes"
        class="flex flex-col gap-4"
      >
        <h2 class="font-display text-xl font-semibold text-heading">Contribuições</h2>
        <p v-if="!hasPixOption" class="text-sm text-text-muted">
          O casal ainda não ativou pagamento online — contribuições ficam disponíveis assim que isso
          for configurado.
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

      <section
        v-if="segments.emotional.length"
        id="presentes-emocionais"
        class="flex flex-col gap-4"
      >
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
