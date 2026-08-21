<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { PublicGift } from '~/types/gift-public'

interface Props {
  modelValue: boolean
  gift: PublicGift
}

const { modelValue, gift } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { amountCents?: number; quotaCount?: number; message: string }]
}>()

// Identificação de quem está presenteando (CLAUDE.md, seção 18) — passo 1,
// pulado se já coletado nesta sessão (ver useGiftGiverIdentity).
const identity = useGiftGiverIdentity()

const step = ref<'identify' | 'choose'>('choose')
// Sugestões rápidas de valor (CLAUDE.md, seção 18) — só usadas no modo de
// contribuição livre (sem gift.quotaAmountCents).
const SUGGESTED_AMOUNTS_CENTS = [5000, 10000, 20000, 30000]
const message = ref('')
const selectedAmountCents = ref<number | null>(null)
const customAmountReaisText = ref('')
const quotaCount = ref(1)

const isQuotaMode = computed(() => Boolean(gift.quotaAmountCents))

const effectiveAmountCents = computed(() => {
  if (customAmountReaisText.value !== '') {
    const value = Number(customAmountReaisText.value.replace(',', '.'))
    return Number.isNaN(value) || value <= 0 ? null : Math.round(value * 100)
  }
  return selectedAmountCents.value
})

const quotaTotalCents = computed(() => (gift.quotaAmountCents ?? 0) * quotaCount.value)

const canSubmit = computed(() =>
  isQuotaMode.value ? quotaCount.value > 0 : Boolean(effectiveAmountCents.value),
)

watch(
  () => modelValue,
  (open) => {
    if (!open) return
    step.value = identity.value.name.trim() ? 'choose' : 'identify'
  },
)

function selectSuggestedAmount(amountCents: number) {
  selectedAmountCents.value = amountCents
  customAmountReaisText.value = ''
}

function submit() {
  if (!canSubmit.value) return
  emit(
    'submit',
    isQuotaMode.value
      ? { quotaCount: quotaCount.value, message: message.value }
      : { amountCents: effectiveAmountCents.value!, message: message.value },
  )
  message.value = ''
  selectedAmountCents.value = null
  customAmountReaisText.value = ''
  quotaCount.value = 1
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="step === 'identify' ? 'Quem está contribuindo?' : `Contribuir com ${gift.title}`"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <GiftsGiftGiverIdentityForm v-if="step === 'identify'" @continue="step = 'choose'" />

    <div v-else class="flex flex-col gap-4">
      <p class="text-xs text-text-muted">
        Presenteando como <strong class="text-text">{{ identity.name }}</strong>
        <button type="button" class="ml-1 text-primary underline" @click="step = 'identify'">
          trocar
        </button>
      </p>

      <template v-if="isQuotaMode">
        <p class="text-sm text-text-muted">
          Cada cota vale {{ formatCentsToBRL(gift.quotaAmountCents!) }}. Escolha quantas cotas quer
          comprar.
        </p>
        <div class="flex items-center gap-3">
          <UiButton
            type="button"
            variant="ghost"
            size="sm"
            :disabled="quotaCount <= 1"
            @click="quotaCount = Math.max(1, quotaCount - 1)"
          >
            <Icon name="lucide:minus" class="h-4 w-4" />
          </UiButton>
          <span class="min-w-10 text-center text-lg font-semibold text-text">{{ quotaCount }}</span>
          <UiButton type="button" variant="ghost" size="sm" @click="quotaCount++">
            <Icon name="lucide:plus" class="h-4 w-4" />
          </UiButton>
          <span class="text-sm text-text-muted">= {{ formatCentsToBRL(quotaTotalCents) }}</span>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-text-muted">Contribua com qualquer valor.</p>
        <div class="flex flex-wrap gap-2">
          <UiChip
            v-for="amount in SUGGESTED_AMOUNTS_CENTS"
            :key="amount"
            :label="formatCentsToBRL(amount)"
            clickable
            :selected="selectedAmountCents === amount"
            @click="selectSuggestedAmount(amount)"
          />
        </div>
        <UiInput v-model="customAmountReaisText" label="Outro valor, em R$" placeholder="0,00" />
      </template>

      <UiTextarea v-model="message" label="Mensagem para o casal (opcional)" :rows="2" />

      <UiButton class="w-full" :disabled="!canSubmit" @click="submit">Contribuir</UiButton>
    </div>
  </UiModal>
</template>
