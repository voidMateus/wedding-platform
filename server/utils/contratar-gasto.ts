import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { gerarParcelasComEntrada } from '#shared/utils/orcamento'
import type { ParcelamentoInput } from '#shared/schemas/finance'
import type { Database } from '~/types/database.types'

/**
 * Contratar: o momento em que o planejamento vira compromisso — **um ato**.
 *
 * Esta lógica vivia inteira dentro de `POST /vendors/:id/contract`, e o caminho
 * sem fornecedor (registrar o valor fechado de um gasto que ninguém cotou)
 * precisava imitá-la no client: um PATCH na despesa, depois um POST de
 * parcelas, cada um disparando as quatro releituras do módulo. Eram duas idas
 * ao servidor e cerca de nove refetches encadeados **com a modal aberta**, e a
 * ficha remontava no meio do caminho em estados intermediários — o "some e
 * aparece várias telas e modais" da rodada de usabilidade de 20/09/2026,
 * ponto 16.
 *
 * Com a lógica aqui, as duas rotas (a do fornecedor e a do gasto) fazem a mesma
 * coisa do mesmo jeito, e o client faz **uma** chamada e **uma** releitura.
 *
 * O que contratar significa, e que este util garante junto:
 *
 *   1. o gasto ganha custo FINAL (deixa de ser estimativa e vira compromisso);
 *   2. o fornecedor, quando existe, fica vinculado nos DOIS sentidos;
 *   3. o estágio do fornecedor vai para `contratado`;
 *   4. as parcelas nascem — e o dinheiro aparece em Pagamentos.
 *
 * **Todo contrato tem um fornecedor** (item C5 da mesma rodada), e ele chega
 * por um dos dois lados: `fornecedorId`, quando a proposta já existia, ou
 * `fornecedorNome`, quando o casal fechou com quem nunca foi cotado. Neste
 * segundo caso o fornecedor **nasce aqui**, no mesmo ato — era o buraco do
 * ponto 17: contratar sem proposta gravava o valor e não deixava contraparte
 * nenhuma, e o casal ficava sem a quem pendurar documento ou telefone.
 *
 * Os dois continuam opcionais no TIPO porque os gastos já contratados sem
 * fornecedor ficam como estão — não inventamos nome para dado antigo. Quem
 * exige um dos dois é o schema, na entrada.
 */
export interface ContratacaoDoGasto {
  despesaId: string
  valorCentavos: number
  parcelamento?: ParcelamentoInput
  fornecedorId?: string | null
  /** Fornecedor novo, criado no mesmo ato da contratação. */
  fornecedorNome?: string | null
}

export async function contratarGasto(
  event: H3Event,
  client: SupabaseClient<Database>,
  weddingId: string,
  memberId: string,
  input: ContratacaoDoGasto,
) {
  const [despesaResult, fornecedorResult] = await Promise.all([
    client
      .from('despesas')
      .select('id, descricao, categoria_id, valor_centavos')
      .eq('id', input.despesaId)
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .maybeSingle(),
    input.fornecedorId
      ? client
          .from('fornecedores')
          .select('id, nome, categoria_id')
          .eq('id', input.fornecedorId)
          .eq('casamento_id', weddingId)
          .is('excluido_em', null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (despesaResult.error) throw badRequestError(despesaResult.error.message)
  if (fornecedorResult.error) throw badRequestError(fornecedorResult.error.message)
  if (!despesaResult.data) throw notFoundError('Gasto não encontrado.')
  if (input.fornecedorId && !fornecedorResult.data) {
    throw notFoundError('Fornecedor não encontrado.')
  }

  // O fornecedor que ainda não existe nasce AQUI, dentro do mesmo ato.
  //
  // Já com `despesa_id` e `estagio: 'contratado'`, porque é exatamente isso que
  // está acontecendo: criar como "em análise" e promover na linha seguinte
  // abriria uma janela em que ele aparece disputando um gasto que já ganhou.
  let fornecedor = fornecedorResult.data
  if (!fornecedor && input.fornecedorNome) {
    const { data: criado, error: erroCriar } = await client
      .from('fornecedores')
      .insert({
        casamento_id: weddingId,
        nome: input.fornecedorNome,
        despesa_id: input.despesaId,
        categoria_id: despesaResult.data.categoria_id,
        estagio: 'contratado',
      })
      .select('id, nome, categoria_id')
      .single()

    if (erroCriar) {
      throw badRequestError(erroCriar.message)
    }
    fornecedor = criado
  }

  const { data: despesa, error: erroDespesa } = await client
    .from('despesas')
    .update({
      valor_centavos: input.valorCentavos,
      ...(fornecedor
        ? {
            fornecedor_id: fornecedor.id,
            // A categoria do fornecedor só é adotada quando o gasto não tinha
            // uma: o casal classificou o gasto no planejamento, e contratar não
            // é hora de remanejar o orçamento por baixo dele.
            categoria_id: despesaResult.data.categoria_id ?? fornecedor.categoria_id,
          }
        : {}),
    })
    .eq('id', input.despesaId)
    .eq('casamento_id', weddingId)
    .select()
    .single()

  if (erroDespesa) {
    throw badRequestError(erroDespesa.message)
  }

  // O vínculo é gravado nos DOIS sentidos. Só `despesas.fornecedor_id` deixava
  // a cotação contratada órfã na tela de Fornecedores — ela caía em "Sem gasto
  // definido" enquanto Pagamentos já mostrava o nome dela no gasto, e as duas
  // telas descreviam realidades diferentes do mesmo contrato.
  if (fornecedor) {
    const { error: erroFornecedor } = await client
      .from('fornecedores')
      .update({ estagio: 'contratado', despesa_id: input.despesaId })
      .eq('id', fornecedor.id)
      .eq('casamento_id', weddingId)

    if (erroFornecedor) {
      throw badRequestError(erroFornecedor.message)
    }
  }

  if (input.parcelamento && input.parcelamento.modo !== 'depois') {
    // Entrada e forma do saldo são duas perguntas, não uma: dar entrada é a
    // maneira normal de contratar fornecedor de casamento, e antes só existia
    // "parcelas iguais" — quem segurava a data com um sinal criava as linhas
    // à mão, uma a uma.
    const parcelas = gerarParcelasComEntrada(
      input.valorCentavos,
      input.parcelamento.entrada ?? null,
      input.parcelamento.modo === 'a_vista'
        ? { quantidade: 1, primeiroVencimento: input.parcelamento.venceEm }
        : {
            quantidade: input.parcelamento.quantidade,
            primeiroVencimento: input.parcelamento.primeiroVencimento,
          },
    )

    // Substitui o que estava em aberto: contratar de novo o mesmo gasto é
    // renegociação, e a parcela antiga descreveria um acordo que não existe
    // mais. Parcela paga nunca é tocada — é fato registrado.
    const { data: emAberto } = await client
      .from('parcelas_despesa')
      .select('id')
      .eq('despesa_id', input.despesaId)
      .is('pago_em', null)

    if (emAberto && emAberto.length > 0) {
      // O erro é checado: um delete que falha volta 200 sem apagar nada, e o
      // insert logo abaixo duplicaria o parcelamento em silêncio.
      const { error: erroLimpeza } = await client
        .from('parcelas_despesa')
        .delete()
        .in(
          'id',
          emAberto.map((parcela) => parcela.id),
        )

      if (erroLimpeza) {
        throw badRequestError(erroLimpeza.message)
      }
    }

    const { data: pagas } = await client
      .from('parcelas_despesa')
      .select('numero')
      .eq('despesa_id', input.despesaId)

    const maiorNumero = (pagas ?? []).reduce((maior, p) => Math.max(maior, p.numero), 0)

    const { error: erroParcelas } = await client.from('parcelas_despesa').insert(
      parcelas.map((parcela) => ({
        casamento_id: weddingId,
        despesa_id: input.despesaId,
        numero: maiorNumero + parcela.numero,
        vence_em: parcela.vence_em,
        valor_centavos: parcela.valor_centavos,
      })),
    )

    if (erroParcelas) {
      throw badRequestError(erroParcelas.message)
    }
  }

  // A trilha é a mesma para os dois caminhos, e o fornecedor entra como
  // metadado quando existe — quem lê a auditoria precisa ver "contratou", não
  // dois verbos diferentes para o mesmo fato.
  await recordAuditLog(event, weddingId, memberId, {
    action: 'finance.vendor.contract',
    entityType: fornecedor ? 'vendor' : 'expense',
    entityId: fornecedor?.id ?? input.despesaId,
    metadata: {
      despesaId: input.despesaId,
      valorCentavos: input.valorCentavos,
      ...(fornecedor ? { fornecedor: fornecedor.nome } : {}),
    },
  })

  return despesa
}
