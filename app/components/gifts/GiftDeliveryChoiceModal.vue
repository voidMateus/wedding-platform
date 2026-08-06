<script setup lang="ts">
import type { PublicGift } from '~/types/gift-public'

interface Props {
  modelValue: boolean
  gift: PublicGift
}

const { modelValue, gift } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'choose-free': [message: string]
  'choose-pix': [message: string]
}>()

// Identificação de quem está presenteando (CLAUDE.md, seção 18) — passo 1,
// pulado se já coletado nesta sessão (ver useGiftGiverIdentity).
const identity = useGiftGiverIdentity()
const step = ref<'identify' | 'choose'>('choose')
const selectedMethod = ref<'free' | 'pix' | null>(null)
const message = ref('')

// O casal decide quais formas ficam disponíveis (CLAUDE.md, seção 18,
// weddings.physical_gift_delivery_mode) — não se aplica a presente de cota,
// sempre pago online.
const allowSelfPurchase = computed(() => gift.physicalDeliveryMode !== 'payment_only')
const allowOnlinePayment = computed(
  () =>
    gift.physicalDeliveryMode !== 'self_purchase_only' &&
    gift.hasPixOption &&
    !gift.isGroupGift &&
    gift.priceCents !== null,
)
const noMethodAvailable = computed(() => !allowSelfPurchase.value && !allowOnlinePayment.value)

watch(
  () => modelValue,
  (open) => {
    if (!open) return
    step.value = identity.value.name.trim() ? 'choose' : 'identify'
    // Só um método disponível: já vem selecionado, sem exigir clique extra.
    selectedMethod.value = allowSelfPurchase.value && !allowOnlinePayment.value
      ? 'free'
      : allowOnlinePayment.value && !allowSelfPurchase.value
        ? 'pix'
        : null
  },
)

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function confirm() {
  if (selectedMethod.value === 'free') {
    emit('choose-free', message.value)
  } else if (selectedMethod.value === 'pix') {
    emit('choose-pix', message.value)
  } else {
    return
  }
  message.value = ''
  selectedMethod.value = null
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="step === 'identify' ? 'Quem está presenteando?' : `Como você quer presentear ${gift.title}?`"
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

      <p v-if="noMethodAvailable" class="text-sm text-text-muted">
        O casal ainda não configurou uma forma de receber este presente. Fale diretamente com eles.
      </p>

      <template v-else>
        <p class="text-sm text-text-muted">
          Escolha a forma mais fácil pra você — não tem certo ou errado.
        </p>

        <div class="flex flex-col gap-3">
          <button
            v-if="allowOnlinePayment"
            type="button"
            class="flex flex-col gap-1 rounded-lg border p-4 text-left transition-brand"
            :class="
              selectedMethod === 'pix'
                ? 'border-primary bg-primary/[0.03]'
                : 'border-border hover:border-primary/40 hover:bg-surface-muted/60'
            "
            @click="selectedMethod = 'pix'"
          >
            <span class="font-medium text-text">Enviar o valor pelo link de pagamento</span>
            <span class="text-sm text-text-muted">
              Você paga {{ formatCents(gift.priceCents!) }} pelo link de pagamento da InfinitePay (Pix
              e/ou cartão, conforme a conta do casal) e o casal compra o item.
            </span>
          </button>

          <button
            v-if="allowSelfPurchase"
            type="button"
            class="flex flex-col gap-1 rounded-lg border p-4 text-left transition-brand"
            :class="
              selectedMethod === 'free'
                ? 'border-primary bg-primary/[0.03]'
                : 'border-border hover:border-primary/40 hover:bg-surface-muted/60'
            "
            @click="selectedMethod = 'free'"
          >
            <span class="font-medium text-text">Vou comprar e entregar</span>
            <span class="text-sm text-text-muted">
              Você compra o item por fora (loja, site) e combina a entrega com o casal.
            </span>
          </button>
        </div>

        <UiTextarea v-model="message" label="Mensagem para o casal (opcional)" :rows="2" />

        <UiButton class="w-full" :disabled="!selectedMethod" @click="confirm">Confirmar</UiButton>
      </template>
    </div>
  </UiModal>
</template>
