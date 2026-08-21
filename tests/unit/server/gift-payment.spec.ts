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

  it('é idempotente: pagamento já confirmado não chama payment_check de novo', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')
    const confirmedPayment = { id: 'payment-1', status_pagamento: 'confirmado', casamento_id: 'w1' }
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
      status_pagamento: 'pendente',
      casamento_id: 'w1',
      presente_id: 'g1',
      valor_centavos: 5000,
      nsu_pedido_provedor: 'payment-1',
      nsu_transacao_provedor: null,
    }
    const confirmedPayment = { ...pendingPayment, status_pagamento: 'confirmado' }

    const client = makeClient(
      [
        chainable({ data: pendingPayment, error: null }), // select pagamentos_presentes
        chainable({ data: { handle_infinitepay: 'casal' }, error: null }), // select casamentos
        chainable({ data: null, error: null }), // update ultima_resposta_provedor
        chainable({ data: null, error: null }), // insert trilha_auditoria
      ],
      { data: confirmedPayment, error: null },
    )

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toEqual(confirmedPayment)
    expect(client.rpc).toHaveBeenCalledWith('confirmar_pagamento_presente', { p_pagamento_id: 'payment-1' })
  })

  it('permanece pendente quando payment_check confirma paid:false (sem marcar falhou numa única checagem)', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    vi.mocked(checkInfinitePayPayment).mockResolvedValue({
      ok: true,
      paid: false,
      raw: { success: true, paid: false },
    })
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')

    const pendingPayment = {
      id: 'payment-1',
      status_pagamento: 'pendente',
      casamento_id: 'w1',
      nsu_pedido_provedor: 'payment-1',
      nsu_transacao_provedor: null,
    }

    const client = makeClient([
      chainable({ data: pendingPayment, error: null }),
      chainable({ data: { handle_infinitepay: 'casal' }, error: null }),
      chainable({ data: null, error: null }), // update ultima_resposta_provedor
    ])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result?.status_pagamento).toBe('pendente')
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('não altera o status quando payment_check falha por rede (retry fica pra próxima tentativa)', async () => {
    const { checkInfinitePayPayment } = await import('../../../server/utils/infinitepay')
    vi.mocked(checkInfinitePayPayment).mockResolvedValue({ ok: false, reason: 'timeout' })
    const { confirmGiftPayment } = await import('../../../server/utils/gift-payment')

    const pendingPayment = { id: 'payment-1', status_pagamento: 'pendente', casamento_id: 'w1' }

    const client = makeClient([
      chainable({ data: pendingPayment, error: null }),
      chainable({ data: { handle_infinitepay: 'casal' }, error: null }),
    ])

    const result = await confirmGiftPayment(client, 'payment-1')

    expect(result).toEqual(pendingPayment)
    expect(client.rpc).not.toHaveBeenCalled()
  })
})
