import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkInfinitePayPayment, createInfinitePayCheckoutLink } from '../../../server/utils/infinitepay'

// $fetch é global do Nitro (auto-import) — fora do runtime do servidor
// (vitest puro) precisa ser stubado manualmente para os testes chamarem o
// código real de server/utils/infinitepay.ts.
beforeEach(() => {
  vi.stubGlobal('$fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createInfinitePayCheckoutLink', () => {
  it('devolve ok:true com a url quando a InfinitePay responde com sucesso', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://checkout.infinitepay.com.br/casal?lenc=abc',
    })

    const result = await createInfinitePayCheckoutLink({
      handle: 'casal',
      redirectUrl: 'https://site.com/retorno',
      webhookUrl: 'https://site.com/webhook',
      orderNsu: 'pagamento-1',
      items: [{ quantity: 1, price: 5000, description: 'Air Fryer' }],
    })

    expect(result).toEqual({ ok: true, checkoutUrl: 'https://checkout.infinitepay.com.br/casal?lenc=abc' })
  })

  it('devolve ok:false quando a resposta não tem url', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const result = await createInfinitePayCheckoutLink({
      handle: 'casal',
      redirectUrl: 'r',
      webhookUrl: 'w',
      orderNsu: 'o',
      items: [{ quantity: 1, price: 100, description: 'd' }],
    })

    expect(result.ok).toBe(false)
  })

  it('devolve ok:false em vez de lançar quando a requisição falha', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'))

    const result = await createInfinitePayCheckoutLink({
      handle: 'casal',
      redirectUrl: 'r',
      webhookUrl: 'w',
      orderNsu: 'o',
      items: [{ quantity: 1, price: 100, description: 'd' }],
    })

    expect(result).toEqual({ ok: false, reason: 'timeout' })
  })
})

describe('checkInfinitePayPayment', () => {
  it('devolve paid:true quando a InfinitePay confirma o pagamento', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, paid: true, amount: 5000 })

    const result = await checkInfinitePayPayment({ handle: 'casal', orderNsu: 'pagamento-1' })

    expect(result).toEqual({
      ok: true,
      paid: true,
      raw: { success: true, paid: true, amount: 5000 },
    })
  })

  it('devolve paid:false quando a InfinitePay ainda não confirmou', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, paid: false })

    const result = await checkInfinitePayPayment({ handle: 'casal', orderNsu: 'pagamento-1' })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.paid).toBe(false)
  })

  it('devolve ok:false em vez de lançar quando a requisição falha', async () => {
    ;($fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'))

    const result = await checkInfinitePayPayment({ handle: 'casal', orderNsu: 'pagamento-1' })

    expect(result).toEqual({ ok: false, reason: 'network error' })
  })
})
