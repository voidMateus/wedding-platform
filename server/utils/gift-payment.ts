import { checkInfinitePayPayment } from './infinitepay'
import type { supabaseAdmin } from './supabase-admin'
import type { GiftPayment } from '~/types/gift-payment'

type AdminClient = Awaited<ReturnType<typeof supabaseAdmin>>

interface ConfirmGiftPaymentHints {
  /** nsu_transacao_provedor devolvido pela InfinitePay (redirect ou webhook). */
  transactionNsu?: string
  /** slug_fatura_provedor devolvido pela InfinitePay (redirect ou webhook). */
  invoiceSlug?: string
}

/**
 * Orquestração central de confirmação de pagamento (CLAUDE.md, seção 28) —
 * chamada tanto pelo webhook da InfinitePay quanto pela página de retorno do
 * convidado ("pull"). Nenhuma das duas fontes é confiável por si só: o corpo
 * do webhook não é assinado, e o retorno do navegador pode ser adulterado.
 * A única prova de pagamento é `payment_check`, chamado servidor-a-servidor
 * aqui dentro — nunca decidido a partir do payload recebido de fora.
 *
 * Idempotente: se o pagamento já está confirmado/falhou/expirado, retorna
 * sem fazer nenhuma chamada externa nova.
 *
 * `hints` — achado real (CLAUDE.md, seção 28.3): `payment_check` não
 * confirma com `order_nsu` sozinho, a InfinitePay exige também
 * `transaction_nsu`/`slug`, que só chegam via querystring no redirect de
 * volta ao site (ou no corpo do webhook) — nunca no momento do checkout.
 * Persistidos assim que aprendidos, pra reaproveitar em chamadas futuras
 * mesmo sem hints novos (ex.: um segundo pull sem esses query params).
 */
export async function confirmGiftPayment(
  client: AdminClient,
  paymentId: string,
  hints?: ConfirmGiftPaymentHints,
): Promise<GiftPayment | null> {
  const { data: payment, error: fetchError } = await client
    .from('pagamentos_presentes')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (fetchError) {
    throw badRequestError(fetchError.message)
  }
  if (!payment) {
    return null
  }
  if (payment.status_pagamento !== 'pendente') {
    return payment
  }

  const transactionNsu = hints?.transactionNsu ?? payment.nsu_transacao_provedor ?? undefined
  const invoiceSlug = hints?.invoiceSlug ?? payment.slug_fatura_provedor ?? undefined

  if (
    (hints?.transactionNsu && hints.transactionNsu !== payment.nsu_transacao_provedor) ||
    (hints?.invoiceSlug && hints.invoiceSlug !== payment.slug_fatura_provedor)
  ) {
    await client
      .from('pagamentos_presentes')
      .update({
        nsu_transacao_provedor: transactionNsu ?? null,
        slug_fatura_provedor: invoiceSlug ?? null,
      })
      .eq('id', paymentId)
  }

  const { data: wedding, error: weddingError } = await client
    .from('casamentos')
    .select('handle_infinitepay')
    .eq('id', payment.casamento_id)
    .maybeSingle()

  if (weddingError) {
    throw badRequestError(weddingError.message)
  }
  if (!wedding?.handle_infinitepay) {
    // Não deveria acontecer (o checkout só é criado com handle configurado),
    // mas sem handle não há como reverificar — permanece pendente.
    return payment
  }

  const check = await checkInfinitePayPayment({
    handle: wedding.handle_infinitepay,
    orderNsu: payment.nsu_pedido_provedor,
    transactionNsu,
    slug: invoiceSlug,
  })

  if (!check.ok) {
    // Falha de rede/timeout na reverificação: não muda o status — o webhook
    // pode chegar de novo, ou o convidado pode voltar a checar mais tarde.
    return payment
  }

  await client
    .from('pagamentos_presentes')
    .update({ ultima_resposta_provedor: check.raw })
    .eq('id', paymentId)

  if (!check.paid) {
    // Uma única checagem negativa não é prova de falha — o Pix pode ainda
    // estar em processamento. Só payment_check confirmando paid=true efetiva
    // o pagamento; nunca marcamos falhou por ausência de confirmação.
    return { ...payment, ultima_resposta_provedor: check.raw }
  }

  const { data: confirmed, error: confirmError } = await client.rpc('confirmar_pagamento_presente', {
    p_pagamento_id: paymentId,
  })

  if (confirmError) {
    throw badRequestError(confirmError.message)
  }

  await recordSystemAuditLog(client, confirmed.casamento_id, {
    action: confirmed.status_pagamento === 'confirmado' ? 'gift_payment.confirmed' : 'gift_payment.failed',
    entityType: 'gift_payment',
    entityId: paymentId,
    metadata: { giftId: confirmed.presente_id, amountCents: confirmed.valor_centavos },
  })

  return confirmed
}

interface SystemAuditLogInput {
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

/**
 * Variante de recordAuditLog (server/utils/audit-log.ts) para gatilhos sem
 * H3Event/sessão — o webhook da InfinitePay não é uma requisição autenticada
 * (CLAUDE.md, seção 19.3/28: ações automatizadas usam tipo_autor='sistema',
 * autor_id nulo). Mesma regra de "falha ao auditar nunca derruba a operação
 * principal".
 */
async function recordSystemAuditLog(
  client: AdminClient,
  weddingId: string,
  input: SystemAuditLogInput,
): Promise<void> {
  const { error } = await client.from('trilha_auditoria').insert({
    casamento_id: weddingId,
    autor_id: null,
    tipo_autor: 'sistema',
    acao: input.action,
    tipo_entidade: input.entityType,
    entidade_id: input.entityId,
    metadados: input.metadata ?? {},
  })

  if (error) {
    console.error('[audit-log] falha ao registrar', input.action, error.message)
  }
}
