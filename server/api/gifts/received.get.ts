import { serverSupabaseClient } from '#supabase/server'

/**
 * O dinheiro que entrou pela lista de presentes — o eixo que a lista não
 * responde.
 *
 * A tela de Presentes mostrava o arrecadado como um número solto no topo e a
 * quantidade de falhas ao lado dele, sem nenhum lugar para investigar uma
 * (rodada de usabilidade de 20/09/2026, ponto 21). Aqui o mesmo dinheiro
 * aparece nos dois recortes que o casal usa: por presente (o que rendeu) e por
 * quem presenteou (a quem agradecer).
 *
 * **Reserva paga vale o preço do presente.** `reservas_presentes` não guarda
 * valor — `checkout.post.ts` nunca aceita outro que não o do próprio presente —,
 * então o valor sai de `presentes.preco_centavos`, do mesmo jeito que na
 * listagem. Reserva sem pagamento (o convidado compra e leva) não é dinheiro, e
 * entra com zero: ela aparece porque quem reservou também merece agradecimento,
 * e some do total porque não entrou nada.
 */
export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const { data: presentes, error: presentesError } = await client
    .from('presentes')
    .select('id, titulo, preco_centavos')
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  if (presentesError) throw badRequestError(presentesError.message)

  const tituloPorPresente = new Map(presentes.map((p) => [p.id, p.titulo]))
  const precoPorPresente = new Map(presentes.map((p) => [p.id, p.preco_centavos ?? 0]))

  const [
    { data: pagamentos, error: pagamentosError },
    { data: reservas, error: reservasError },
    { data: contribuicoes, error: contribuicoesError },
  ] = await Promise.all([
    client
      .from('pagamentos_presentes')
      .select(
        'id, presente_id, nome_presenteador, telefone_presenteador, valor_centavos, status_pagamento, motivo_falha, reserva_resultante_id, contribuicao_resultante_id, created_at, confirmado_em',
      )
      .eq('casamento_id', weddingId)
      .in('status_pagamento', ['confirmado', 'falhou'])
      .order('created_at', { ascending: false }),
    client
      .from('reservas_presentes')
      .select('id, presente_id, nome_contribuinte, reservado_em')
      .eq('casamento_id', weddingId),
    client
      .from('contribuicoes_presentes')
      .select('presente_id, nome_contribuinte, valor_centavos, quantidade_cotas, contribuido_em')
      .eq('casamento_id', weddingId),
  ])

  if (pagamentosError) throw badRequestError(pagamentosError.message)
  if (reservasError) throw badRequestError(reservasError.message)
  if (contribuicoesError) throw badRequestError(contribuicoesError.message)

  const confirmados = (pagamentos ?? []).filter((p) => p.status_pagamento === 'confirmado')
  const reservasPagas = new Set(
    confirmados.map((p) => p.reserva_resultante_id).filter((id): id is string => Boolean(id)),
  )

  /** Um lançamento por gesto — é a lista que os dois recortes somam. */
  const lancamentos = [
    ...(reservas ?? []).map((reserva) => ({
      presenteId: reserva.presente_id,
      nome: reserva.nome_contribuinte ?? 'Anônimo',
      centavos: reservasPagas.has(reserva.id)
        ? (precoPorPresente.get(reserva.presente_id) ?? 0)
        : 0,
      pago: reservasPagas.has(reserva.id),
      quando: reserva.reservado_em,
    })),
    // Contribuição é sempre paga online (CLAUDE.md, seção 12).
    ...(contribuicoes ?? []).map((contribuicao) => ({
      presenteId: contribuicao.presente_id,
      nome: contribuicao.nome_contribuinte ?? 'Anônimo',
      centavos: contribuicao.valor_centavos,
      pago: true,
      quando: contribuicao.contribuido_em,
    })),
  ]

  const porPresente = new Map<string, { centavos: number; gestos: number }>()
  const porPessoa = new Map<string, { centavos: number; gestos: number; ultimoEm: string }>()

  for (const lancamento of lancamentos) {
    const doPresente = porPresente.get(lancamento.presenteId) ?? { centavos: 0, gestos: 0 }
    porPresente.set(lancamento.presenteId, {
      centavos: doPresente.centavos + lancamento.centavos,
      gestos: doPresente.gestos + 1,
    })

    const daPessoa = porPessoa.get(lancamento.nome) ?? {
      centavos: 0,
      gestos: 0,
      ultimoEm: lancamento.quando,
    }
    porPessoa.set(lancamento.nome, {
      centavos: daPessoa.centavos + lancamento.centavos,
      gestos: daPessoa.gestos + 1,
      ultimoEm: lancamento.quando > daPessoa.ultimoEm ? lancamento.quando : daPessoa.ultimoEm,
    })
  }

  return {
    /** Só o que entrou de verdade — reserva sem pagamento não soma. */
    totalCents: confirmados.reduce((soma, p) => soma + p.valor_centavos, 0),

    // `id` é o do próprio presente, e `id` em vez de `giftId` porque a tabela
    // do admin identifica linha por ele — dois campos com o mesmo valor seriam
    // duas chances de divergir.
    byGift: [...porPresente.entries()]
      .map(([id, resumo]) => ({
        id,
        title: tituloPorPresente.get(id) ?? 'Presente removido',
        cents: resumo.centavos,
        entries: resumo.gestos,
      }))
      .sort((a, b) => b.cents - a.cents || a.title.localeCompare(b.title, 'pt-BR')),

    // A agregação é POR NOME, então o nome é a identidade da linha: não existe
    // cadastro de presenteador, e duas pessoas homônimas são, para esta conta,
    // a mesma linha — o que é o comportamento certo para "a quem agradecer".
    byGiver: [...porPessoa.entries()]
      .map(([name, resumo]) => ({
        id: name,
        name,
        cents: resumo.centavos,
        entries: resumo.gestos,
        lastAt: resumo.ultimoEm,
      }))
      .sort((a, b) => b.cents - a.cents || b.lastAt.localeCompare(a.lastAt)),

    /**
     * O convidado pagou e a plataforma não conseguiu reservar/registrar —
     * exige ação manual. Era um contador sem destino; aqui é a linha com o
     * presente, o nome, o valor e o motivo, que é o que permite resolver.
     */
    failed: (pagamentos ?? [])
      .filter((p) => p.status_pagamento === 'falhou')
      .map((p) => ({
        id: p.id,
        giftId: p.presente_id,
        giftTitle: tituloPorPresente.get(p.presente_id) ?? 'Presente removido',
        name: p.nome_presenteador,
        phone: p.telefone_presenteador,
        cents: p.valor_centavos,
        reason: p.motivo_falha,
        at: p.created_at,
      })),
  }
})
