import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../server/utils/infinitepay', () => ({
  checkInfinitePayPayment: vi.fn(),
}))

// badRequestError é global do Nitro (auto-import) — stubado pra rodar fora
// do runtime do servidor (mesmo racional de infinitepay.spec.ts).
beforeEach(() => {
  vi.stubGlobal(
    'badRequestError',
    vi.fn((message: string) => new Error(message)),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// Builder mínimo que imita o encadeamento do supabase-js (thenable em
// qualquer ponto da cadeia) — só os métodos realmente usados por
// confirmGiftPayment (CLAUDE.md, seção 28).
function chainable(result: { data?: unknown; error?: unknown }) {
  const node: Record<string, unknown> = {
    select: () => node,
    eq: () => node,
    update: () => node,
    insert: () => node,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return node
}

function makeClient(fromImpls: Array<ReturnType<typeof chainable>>, rpcResult?: { data?: unknown; error?: unknown }) {
  const from = vi.fn()
  for (const impl of fromImpls) {
    from.mockImplementationOnce(() => impl)
  }
  const rpc = vi.fn().mockResolvedValue(rpcResult ?? { data: null, error: null })
  return { from, rpc } as never
}

describe('confirmGiftPayment', () => {
  it('retorna null quando o pagamento não existe', async () => {
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')
    const client = makeClient([chainable({ data: null, error: null })])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toBeNull()
  })

  it('é idempotente: pagamento já confirmed não chama payment_check de novo', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')
    const confirmedPayment = { id: 'payment-1', status: 'confirmed', wedding_id: 'w1' }
    const client = makeClient([chainable({ data: confirmedPayment, error: null })])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toEqual(confirmedPayment)
    expect(checkInfinitePayPayment).not.toHaveBeenCalled()
  })

  it('efetiva o pagamento quando payment_check confirma paid:true', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    vi.mocked(checkInfinitePayPayment).mockResolvedValue({
      ok: true,
      paid: true,
      raw: { success: true, paid: true },
    })
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')

    const pendingPayment = {
      id: 'payment-1',
      status: 'pending',
      wedding_id: 'w1',
      gift_id: 'g1',
      amount_cents: 5000,
      provider_order_nsu: 'payment-1',
      provider_transaction_nsu: null,
    }
    const confirmedPayment = { ...pendingPayment, status: 'confirmed' }

    const client = makeClient(
      [
        chainable({ data: pendingPayment, error: null }), // select gift_payments
        chainable({ data: { infinitepay_handle: 'casal' }, error: null }), // select weddings
        chainable({ data: null, error: null }), // update last_provider_response
        chainable({ data: null, error: null }), // insert audit_logs
      ],
      { data: confirmedPayment, error: null },
    )

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toEqual(confirmedPayment)
    expect(client.rpc).toHaveBeenCalledWith('confirm_gift_payment', { p_payment_id: 'payment-1' })
  })

  it('permanece pending quando payment_check confirma paid:false (sem marcar failed numa única checagem)', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    vi.mocked(checkInfinitePayPayment).mockResolvedValue({
      ok: true,
      paid: false,
      raw: { success: true, paid: false },
    })
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')

    const pendingPayment = {
      id: 'payment-1',
      status: 'pending',
      wedding_id: 'w1',
      provider_order_nsu: 'payment-1',
      provider_transaction_nsu: null,
    }

    const client = makeClient([
      chainable({ data: pendingPayment, error: null }),
      chainable({ data: { infinitepay_handle: 'casal' }, error: null }),
      chainable({ data: null, error: null }), // update last_provider_response
    ])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result?.status).toBe('pending')
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('não altera o status quando payment_check falha por rede (retry fica pra próxima tentativa)', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    vi.mocked(checkInfinitePayPayment).mockResolvedValue({ ok: false, reason: 'timeout' })
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')

    const pendingPayment = { id: 'payment-1', status: 'pending', wedding_id: 'w1' }

    const client = makeClient([
      chainable({ data: pendingPayment, error: null }),
      chainable({ data: { infinitepay_handle: 'casal' }, error: null }),
    ])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toEqual(pendingPayment)
    expect(client.rpc).not.toHaveBeenCalled()
  })
})
