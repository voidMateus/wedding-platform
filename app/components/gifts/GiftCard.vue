<script setup lang="ts">
import type { PublicGift } from '~/types/gift-public'

interface Props {
  gift: PublicGift
}

const { gift } = defineProps<Props>()

const emit = defineEmits<{
  reserve: [message: string]
  checkout: [payload: { kind: 'reservation' | 'contribution'; amountCents?: number; quotaCount?: number; message: string }]
}>()

const isDeliveryModalOpen = ref(false)
const isPaymentModalOpen = ref(false)

function formatCents(cents: number | null): string {
  if (cents === null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// O casal pode restringir a Lista de Presentes física a um só método
// (CLAUDE.md, seção 18, weddings.physical_gift_delivery_mode) — se nenhum
// dos dois ficar disponível (ex.: só pagamento configurado, mas sem
// infinitepay_handle), não há como presentear esse item por aqui.
const canPresentPhysical = computed(() => {
  const allowSelfPurchase = gift.physicalDeliveryMode !== 'payment_only'
  const allowOnlinePayment =
    gift.physicalDeliveryMode !== 'self_purchase_only' && gift.hasPixOption && gift.priceCents !== null
  return allowSelfPurchase || allowOnlinePayment
})

const progressPercent = computed(() => {
  if (!gift.isGroupGift || !gift.targetAmountCents) return 0
  return Math.min(
    100,
    Math.round(((gift.collectedAmountCents ?? 0) / gift.targetAmountCents) * 100),
  )
})

function handleChooseFree(message: string) {
  isDeliveryModalOpen.value = false
  emit('reserve', message)
}

function handleChoosePix(message: string) {
  isDeliveryModalOpen.value = false
  emit('checkout', { kind: 'reservation', message })
}

function handlePaymentSubmit(payload: { amountCents?: number; quotaCount?: number; message: string }) {
  isPaymentModalOpen.value = false
  emit('checkout', { kind: 'contribution', ...payload })
}
</script>

<template>
  <UiCard padding="none" radius="xl" elevation="xl" class="flex h-full flex-col overflow-hidden">
    <div v-if="gift.displayStyle === 'emotional'" class="flex flex-col items-center gap-2 p-5 pb-0 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon :name="`lucide:${gift.emotionalIcon ?? 'heart-handshake'}`" class="h-6 w-6" />
      </span>
    </div>
    <div v-else-if="gift.imageUrl" class="relative">
      <NuxtImg :src="gift.imageUrl" :alt="gift.title" class="h-48 w-full object-cover" sizes="400px" />
      <span
        v-if="!gift.isGroupGift && gift.priceCents !== null"
        class="absolute bottom-3 right-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm"
      >
        {{ formatCents(gift.priceCents) }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-3 p-5">
      <div :class="gift.displayStyle === 'emotional' ? 'text-center' : ''">
        <div class="flex items-start justify-between gap-2" :class="gift.displayStyle === 'emotional' ? 'justify-center' : ''">
          <h3 class="font-display text-base font-semibold text-heading">{{ gift.title }}</h3>
          <UiBadge v-if="gift.categoryName && gift.displayStyle !== 'emotional'" tone="neutral">
            {{ gift.categoryName }}
          </UiBadge>
        </div>
        <p v-if="gift.description" class="mt-1 text-sm leading-relaxed text-text-muted">
          {{ gift.description }}
        </p>
      </div>

      <div class="mt-auto flex flex-col gap-3">
        <template v-if="!gift.isGroupGift">
          <p v-if="!gift.imageUrl" class="text-sm font-medium text-text">{{ formatCents(gift.priceCents) }}</p>
          <div>
            <UiBadge v-if="(gift.quantityAvailable ?? 0) > 0" tone="neutral">Disponível</UiBadge>
            <UiBadge v-else tone="danger">Esgotado</UiBadge>
          </div>

          <UiButton
            v-if="(gift.quantityAvailable ?? 0) > 0 && canPresentPhysical"
            class="w-full"
            rounded="full"
            @click="isDeliveryModalOpen = true"
          >
            <Icon name="lucide:gift" class="h-4 w-4" />
            Presentear
          </UiButton>
        </template>

        <template v-else>
          <div class="flex flex-col gap-1.5">
            <div class="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
              <div class="h-full rounded-full bg-primary transition-[width]" :style="{ width: `${progressPercent}%` }" />
            </div>
            <p class="text-sm text-text-muted">
              <span class="font-medium text-text">{{ formatCents(gift.collectedAmountCents) }}</span>
              de {{ formatCents(gift.targetAmountCents) }} arrecadados
            </p>
          </div>

          <UiButton v-if="gift.hasPixOption" class="w-full" rounded="full" @click="isPaymentModalOpen = true">
            <Icon name="lucide:heart-handshake" class="h-4 w-4" />
            {{ gift.quotaAmountCents ? 'Comprar cotas' : 'Contribuir' }}
          </UiButton>
        </template>
      </div>
    </div>

    <GiftsGiftDeliveryChoiceModal
      v-if="!gift.isGroupGift"
      v-model="isDeliveryModalOpen"
      :gift="gift"
      @choose-free="handleChooseFree"
      @choose-pix="handleChoosePix"
    />
    <GiftsGiftPaymentModal
      v-if="gift.isGroupGift"
      v-model="isPaymentModalOpen"
      :gift="gift"
      @submit="handlePaymentSubmit"
    />
  </UiCard>
</template>
