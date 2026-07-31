<script setup lang="ts">
// noindex quando personalizado por código (CLAUDE.md, seção 26) — a versão
// sem código continua pública/indexável, como a home (ARCHITECTURE.md 2.2).
definePageMeta({ layout: 'default' })

const route = useRoute()
const code = typeof route.query.code === 'string' ? route.query.code : undefined

const { getPublicGifts, reserveGift, contributeToGift, cancelGift } = usePublicGifts(code)
const { data, status, refresh } = getPublicGifts()

useSeoMeta({
  title: 'Lista de presentes',
  robots: code ? 'noindex, nofollow' : undefined,
})

interface ApiError {
  statusCode?: number
}

function isConflict(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as ApiError).statusCode === 409
}

const feedbackMessage = ref<string | null>(null)
const feedbackTone = ref<'success' | 'error'>('success')

async function handleReserve(giftId: string) {
  try {
    await reserveGift(giftId)
    feedbackTone.value = 'success'
    feedbackMessage.value = 'Presente reservado! Obrigado.'
    await refresh()
  } catch (err) {
    feedbackTone.value = 'error'
    feedbackMessage.value = isConflict(err)
      ? 'Esse presente acabou de ser reservado por outra pessoa.'
      : 'Não foi possível reservar. Tente novamente.'
  }
}

async function handleCancel(giftId: string) {
  try {
    await cancelGift(giftId)
    feedbackTone.value = 'success'
    feedbackMessage.value = 'Cancelado.'
    await refresh()
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Não foi possível cancelar. Tente novamente.'
  }
}

async function handleContribute(giftId: string, amountCents: number) {
  try {
    await contributeToGift(giftId, amountCents)
    feedbackTone.value = 'success'
    feedbackMessage.value = 'Contribuição registrada! Obrigado.'
    await refresh()
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Não foi possível registrar a contribuição. Tente novamente.'
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
    <div>
      <h1 class="text-2xl font-semibold text-text">Lista de presentes</h1>
      <p v-if="!code" class="mt-2 text-sm text-text-muted">
        Acesse pelo link enviado a você para poder reservar ou contribuir.
      </p>
    </div>

    <p
      v-if="feedbackMessage"
      class="text-sm"
      :class="feedbackTone === 'success' ? 'text-green-700' : 'text-red-600'"
      :role="feedbackTone === 'success' ? 'status' : 'alert'"
    >
      {{ feedbackMessage }}
    </p>

    <div v-if="status === 'pending'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiSkeleton v-for="n in 6" :key="n" class="h-64 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum presente cadastrado ainda"
      description="Volte em breve para conferir a lista."
    />

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <GiftsGiftCard
        v-for="gift in data.data"
        :key="gift.id"
        :gift="gift"
        :has-code="Boolean(code)"
        @reserve="handleReserve(gift.id)"
        @cancel="handleCancel(gift.id)"
        @contribute="(amountCents) => handleContribute(gift.id, amountCents)"
      />
    </div>
  </div>
</template>
