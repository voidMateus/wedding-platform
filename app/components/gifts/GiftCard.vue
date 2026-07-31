<script setup lang="ts">
import type { PublicGift } from '~/types/gift-public'

interface Props {
  gift: PublicGift
  hasCode: boolean
}

const { gift, hasCode } = defineProps<Props>()

const emit = defineEmits<{
  reserve: []
  cancel: []
  contribute: [amountCents: number]
}>()

const isContributing = ref(false)
const contributionReaisText = ref('')

function formatCents(cents: number | null): string {
  if (cents === null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const progressPercent = computed(() => {
  if (!gift.isGroupGift || !gift.targetAmountCents) return 0
  return Math.min(
    100,
    Math.round(((gift.collectedAmountCents ?? 0) / gift.targetAmountCents) * 100),
  )
})

function submitContribution() {
  const value = Number(contributionReaisText.value.replace(',', '.'))
  if (Number.isNaN(value) || value <= 0) return
  emit('contribute', Math.round(value * 100))
  isContributing.value = false
  contributionReaisText.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
    <img
      v-if="gift.imageUrl"
      :src="gift.imageUrl"
      :alt="gift.title"
      class="h-40 w-full rounded-md object-cover"
    />
    <div>
      <h3 class="font-medium text-text">{{ gift.title }}</h3>
      <p v-if="gift.description" class="mt-1 text-sm text-text-muted">{{ gift.description }}</p>
    </div>

    <template v-if="!gift.isGroupGift">
      <p class="text-sm text-text-muted">{{ formatCents(gift.priceCents) }}</p>
      <div>
        <UiBadge v-if="gift.reservedByMe" tone="success">Você reservou</UiBadge>
        <UiBadge v-else-if="(gift.quantityAvailable ?? 0) > 0" tone="neutral">Disponível</UiBadge>
        <UiBadge v-else tone="danger">Esgotado</UiBadge>
      </div>

      <UiButton v-if="gift.reservedByMe" size="sm" variant="destructive" @click="emit('cancel')">
        Cancelar reserva
      </UiButton>
      <UiButton
        v-else-if="hasCode && (gift.quantityAvailable ?? 0) > 0"
        size="sm"
        @click="emit('reserve')"
      >
        Reservar
      </UiButton>
    </template>

    <template v-else>
      <div class="flex flex-col gap-1">
        <div class="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div class="h-full bg-primary" :style="{ width: `${progressPercent}%` }" />
        </div>
        <p class="text-sm text-text-muted">
          {{ formatCents(gift.collectedAmountCents) }} de {{ formatCents(gift.targetAmountCents) }}
          arrecadados
        </p>
      </div>

      <p v-if="(gift.contributedByMeCents ?? 0) > 0" class="text-sm text-text">
        Você contribuiu com {{ formatCents(gift.contributedByMeCents) }}
      </p>

      <div v-if="hasCode" class="flex flex-col gap-2">
        <div v-if="isContributing" class="flex items-center gap-2">
          <UiInput v-model="contributionReaisText" placeholder="0,00" class="flex-1" />
          <UiButton size="sm" @click="submitContribution">Confirmar</UiButton>
          <UiButton size="sm" variant="ghost" @click="isContributing = false">Cancelar</UiButton>
        </div>
        <UiButton v-else size="sm" @click="isContributing = true">Contribuir</UiButton>

        <UiButton
          v-if="(gift.contributedByMeCents ?? 0) > 0"
          size="sm"
          variant="destructive"
          @click="emit('cancel')"
        >
          Cancelar minha contribuição
        </UiButton>
      </div>
    </template>
  </div>
</template>
