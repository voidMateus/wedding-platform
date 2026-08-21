import { useIntervalFn } from '@vueuse/core'
import type { GiftPaymentStatus } from '~/composables/usePublicGifts'

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 20

/**
 * Consulta o status de um pagamento em polling ("pull" — reforça o webhook
 * da InfinitePay, idempotente, cobre o caso do webhook nunca chegar) até sair
 * de `pending` ou atingir MAX_POLL_ATTEMPTS.
 */
export function useGiftPaymentPolling(
  paymentId: string,
  paymentHints: { transactionNsu?: string; slug?: string },
) {
  const { getPaymentStatus } = usePublicGifts()

  const result = ref<GiftPaymentStatus | null>(null)
  const loadError = ref(false)
  let attempts = 0

  const { pause } = useIntervalFn(
    async () => {
      attempts++
      try {
        result.value = await getPaymentStatus(paymentId, attempts === 1 ? paymentHints : undefined)
        loadError.value = false
      } catch {
        loadError.value = true
      }
      if (result.value?.status !== 'pendente' || attempts >= MAX_POLL_ATTEMPTS) {
        pause()
      }
    },
    POLL_INTERVAL_MS,
    { immediate: true },
  )

  return { result, loadError }
}
