import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import type { CategoriaComDespesas, DespesaComParcelas } from '~/types/finance'
import { linhaDeCategoria, totaisDaDespesa, type GrupoDeCategoria } from '#shared/utils/orcamento'

/**
 * A leitura do orçamento inteiro, num lugar só — usada pelo resumo e pela
 * listagem de despesas.
 *
 * Carrega tudo de uma vez (sem paginar) porque um casamento tem dezenas de
 * despesas, não milhares: é a mesma decisão registrada em
 * docs/fase1-financeiro.md seção 5 que dispensa view. Se um dia passar de ~300
 * despesas, a listagem pagina e o resumo por despesa vira view com
 * `security_invoker = true` — nunca agregação em memória sobre página.
 */

type Client = SupabaseClient<Database>

const GRUPO_SEM_CATEGORIA = 'Sem categoria'

export interface OrcamentoCarregado {
  tetoCentavos: number | null
  /** Entrada dos cálculos puros de `shared/utils/orcamento.ts`. */
  grupos: GrupoDeCategoria[]
  /** A árvore pronta para a tela de Orçamento, na ordem de exibição. */
  categorias: CategoriaComDespesas[]
  despesas: DespesaComParcelas[]
  vazio: boolean
}

export async function carregarOrcamento(
  client: Client,
  weddingId: string,
): Promise<OrcamentoCarregado> {
  const [casamentoResult, categoriasResult, despesasResult, parcelasResult] = await Promise.all([
    client.from('casamentos').select('orcamento_total_centavos').eq('id', weddingId).single(),
    client
      .from('categorias_orcamento')
      .select('*')
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .order('ordem_exibicao', { ascending: true }),
    client
      .from('despesas')
      // A FK precisa ser explícita: desde que o fornecedor passou a apontar para
      // o gasto que ele cota, existem DUAS relações entre despesas e
      // fornecedores, e o PostgREST recusa o embed ambíguo com 400.
      .select(
        '*, categoria:categorias_orcamento (id, nome), fornecedor:fornecedores!despesas_fornecedor_id_fkey (id, nome)',
      )
      .eq('casamento_id', weddingId)
      .is('excluido_em', null)
      .order('created_at', { ascending: true }),
    client
      .from('parcelas_despesa')
      .select('*')
      .eq('casamento_id', weddingId)
      .order('numero', { ascending: true }),
  ])

  if (casamentoResult.error) throw badRequestError(casamentoResult.error.message)
  if (categoriasResult.error) throw badRequestError(categoriasResult.error.message)
  if (despesasResult.error) throw badRequestError(despesasResult.error.message)
  if (parcelasResult.error) throw badRequestError(parcelasResult.error.message)

  const categoriasAtivas = categoriasResult.data ?? []
  const linhasDespesa = despesasResult.data ?? []
  const parcelas = parcelasResult.data ?? []

  const parcelasPorDespesa = new Map<string, typeof parcelas>()
  for (const parcela of parcelas) {
    const lista = parcelasPorDespesa.get(parcela.despesa_id) ?? []
    lista.push(parcela)
    parcelasPorDespesa.set(parcela.despesa_id, lista)
  }

  const despesas: DespesaComParcelas[] = linhasDespesa.map((linha) => {
    const { categoria, fornecedor, ...despesa } = linha
    const parcelasDaDespesa = parcelasPorDespesa.get(despesa.id) ?? []
    return {
      ...despesa,
      categoria: categoria ?? null,
      fornecedor: fornecedor ?? null,
      parcelas: parcelasDaDespesa,
      totais: totaisDaDespesa({
        valor_estimado_centavos: despesa.valor_estimado_centavos,
        valor_centavos: despesa.valor_centavos,
        parcelas: parcelasDaDespesa,
      }),
    }
  })

  const idsDeCategoriaAtiva = new Set(categoriasAtivas.map((categoria) => categoria.id))
  const despesasPorCategoria = new Map<string | null, DespesaComParcelas[]>()
  for (const despesa of despesas) {
    // Despesa cuja categoria foi arquivada cai em "Sem categoria" em vez de
    // sumir do total: perder R$ 20.000 de um resumo financeiro por causa de um
    // arquivamento seria pior que exibi-los sem rótulo.
    const chave =
      despesa.categoria_id && idsDeCategoriaAtiva.has(despesa.categoria_id)
        ? despesa.categoria_id
        : null
    const lista = despesasPorCategoria.get(chave) ?? []
    lista.push(despesa)
    despesasPorCategoria.set(chave, lista)
  }

  const grupos: GrupoDeCategoria[] = categoriasAtivas.map((categoria) => ({
    categoriaId: categoria.id,
    nome: categoria.nome,
    valorPrevistoCentavos: categoria.valor_previsto_centavos,
    despesas: (despesasPorCategoria.get(categoria.id) ?? []).map((despesa) => ({
      valor_estimado_centavos: despesa.valor_estimado_centavos,
      valor_centavos: despesa.valor_centavos,
      parcelas: despesa.parcelas,
    })),
  }))

  const semCategoria = despesasPorCategoria.get(null) ?? []
  if (semCategoria.length > 0) {
    grupos.push({
      categoriaId: null,
      nome: GRUPO_SEM_CATEGORIA,
      valorPrevistoCentavos: 0,
      despesas: semCategoria.map((despesa) => ({
        valor_estimado_centavos: despesa.valor_estimado_centavos,
        valor_centavos: despesa.valor_centavos,
        parcelas: despesa.parcelas,
      })),
    })
  }

  const categorias: CategoriaComDespesas[] = grupos.map((grupo) => ({
    ...linhaDeCategoria(grupo),
    ordemExibicao:
      categoriasAtivas.find((categoria) => categoria.id === grupo.categoriaId)?.ordem_exibicao ??
      Number.MAX_SAFE_INTEGER,
    despesas: grupo.categoriaId
      ? (despesasPorCategoria.get(grupo.categoriaId) ?? [])
      : semCategoria,
  }))

  return {
    tetoCentavos: casamentoResult.data.orcamento_total_centavos,
    grupos,
    categorias,
    despesas,
    vazio: categoriasAtivas.length === 0 && despesas.length === 0,
  }
}

/**
 * Quanto já entrou pela lista de presentes. Fonte única: `pagamentos_presentes`
 * confirmados — reserva gratuita ("vou comprar e entregar") não é dinheiro que
 * entrou, e somá-la infla a entrada com intenção de presente.
 */
export async function carregarEntradasDePresentes(client: Client, weddingId: string) {
  const { data, error } = await client
    .from('pagamentos_presentes')
    .select('valor_centavos')
    .eq('casamento_id', weddingId)
    .eq('status_pagamento', 'confirmado')

  if (error) throw badRequestError(error.message)

  const linhas = data ?? []
  return {
    totalCentavos: linhas.reduce((total, linha) => total + linha.valor_centavos, 0),
    quantidade: linhas.length,
  }
}
