// Cliente mínimo da API de checkout hospedado da InfinitePay (CLAUDE.md,
// seção 3/18/28) — sem SDK oficial, chamado via $fetch. Sem sandbox
// documentado publicamente: URL fixa, sem runtimeConfig pra alternar
// ambiente (nada consome isso hoje). Autenticação é só o `handle` (InfiniteTag
// pública do recebedor) — a API pública de link de pagamento não documenta
// API key/token.
//
// Toda função aqui devolve um shape { ok, ... } em vez de lançar em caso de
// falha de rede/resposta inesperada — o chamador (server/utils/gift-payment.ts)
// precisa decidir o que fazer sem que uma instabilidade da InfinitePay vire
// uma exceção não tratada no meio do fluxo de confirmação de pagamento.

const INFINITEPAY_API_BASE_URL = 'https://api.checkout.infinitepay.io'
const REQUEST_TIMEOUT_MS = 8000

interface CreateCheckoutLinkInput {
  handle: string
  redirectUrl: string
  webhookUrl: string
  orderNsu: string
  items: Array<{ quantity: number; price: number; description: string }>
}

type CreateCheckoutLinkResult = { ok: true; checkoutUrl: string } | { ok: false; reason: string }

export async function createInfinitePayCheckoutLink(
  input: CreateCheckoutLinkInput,
): Promise<CreateCheckoutLinkResult> {
  try {
    const response = await $fetch<{ url: string }>(`${INFINITEPAY_API_BASE_URL}/links`, {
      method: 'POST',
      timeout: REQUEST_TIMEOUT_MS,
      body: {
        handle: input.handle,
        redirect_url: input.redirectUrl,
        webhook_url: input.webhookUrl,
        order_nsu: input.orderNsu,
        items: input.items,
      },
    })
    if (!response?.url) {
      return { ok: false, reason: 'InfinitePay não retornou uma URL de checkout.' }
    }
    return { ok: true, checkoutUrl: response.url }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Falha ao criar o checkout.' }
  }
}

interface CheckPaymentInput {
  handle: string
  orderNsu: string
  transactionNsu?: string
  slug?: string
}

interface InfinitePayPaymentCheckResponse {
  success: boolean
  paid: boolean
  amount?: number
  paid_amount?: number
  installments?: number
  capture_method?: string
}

type CheckPaymentResult =
  | { ok: true; paid: boolean; raw: InfinitePayPaymentCheckResponse }
  | { ok: false; reason: string }

export async function checkInfinitePayPayment(
  input: CheckPaymentInput,
): Promise<CheckPaymentResult> {
  try {
    const response = await $fetch<InfinitePayPaymentCheckResponse>(
      `${INFINITEPAY_API_BASE_URL}/payment_check`,
      {
        method: 'POST',
        timeout: REQUEST_TIMEOUT_MS,
        body: {
          handle: input.handle,
          order_nsu: input.orderNsu,
          transaction_nsu: input.transactionNsu,
          slug: input.slug,
        },
      },
    )
    return { ok: true, paid: Boolean(response?.paid), raw: response }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Falha ao consultar o pagamento.',
    }
  }
}
