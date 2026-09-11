import type {
  BudgetCategoryInput,
  BudgetCategoryPatch,
  ExpenseInput,
  ExpensePatch,
  InstallmentPatch,
  InstallmentsGenerateInput,
  VendorContractInput,
} from '#shared/schemas/finance'
import type {
  CategoriaComDespesas,
  CategoriaOrcamento,
  Despesa,
  PagamentoListado,
  ParcelaDespesa,
  ResumoDePagamentos,
  ResumoFinanceiro,
} from '~/types/finance'

interface OrcamentoResponse {
  categorias: CategoriaComDespesas[]
  tetoCentavos: number | null
  vazio: boolean
}

/**
 * O Financeiro do client: resumo, orçamento e as mutações de
 * categoria/despesa/parcela (CLAUDE.md, seção 4.1 — toda chamada de rede passa
 * por um composable).
 *
 * As chaves de `useFetch` são fixas para as duas telas compartilharem o mesmo
 * cache: marcar uma parcela como paga na tela de Orçamento precisa poder
 * atualizar o resumo da Visão geral sem refetch duplicado.
 */
export const CHAVE_RESUMO_FINANCEIRO = 'finance-summary'
export const CHAVE_ORCAMENTO = 'finance-budget'
export const CHAVE_CATEGORIAS = 'finance-categories'
export const CHAVE_PAGAMENTOS = 'finance-payments'

export function useFinance() {
  function getResumo() {
    return useFetch<ResumoFinanceiro>('/api/finance/summary', { key: CHAVE_RESUMO_FINANCEIRO })
  }

  function getOrcamento() {
    return useFetch<OrcamentoResponse>('/api/finance/expenses', { key: CHAVE_ORCAMENTO })
  }

  /**
   * Categorias, ATIVAS E ARQUIVADAS numa requisição só — quem consome separa
   * as duas. Duas chamadas para a mesma rota, distinguidas só por uma query,
   * davam empate de cache e a lista de arquivadas chegava vazia sem nenhum
   * erro para acusar.
   */
  function listCategorias() {
    return useFetch<{ data: CategoriaOrcamento[] }>('/api/finance/categories?incluirArquivadas=1', {
      key: CHAVE_CATEGORIAS,
    })
  }

  /**
   * Pagamentos: tudo que já virou compromisso — as parcelas e também o saldo
   * contratado que ainda não tem data. O recorte é feito na tela, pelo filtro
   * de coluna: a lista é de dezenas de linhas, e um ir-e-voltar por clique de
   * filtro só somaria espera.
   */
  function getPagamentos() {
    return useFetch<{ data: PagamentoListado[]; resumo: ResumoDePagamentos; hoje: string }>(
      '/api/finance/payments',
      { key: CHAVE_PAGAMENTOS },
    )
  }

  /**
   * Recarrega as telas de uma vez — planejar, contratar e pagar mexem nos
   * mesmos números vistos de ângulos diferentes, e uma tela desatualizada
   * mostraria um total que discorda da outra.
   */
  async function atualizarFinanceiro() {
    await Promise.all([
      refreshNuxtData(CHAVE_RESUMO_FINANCEIRO),
      refreshNuxtData(CHAVE_ORCAMENTO),
      refreshNuxtData(CHAVE_CATEGORIAS),
      refreshNuxtData(CHAVE_PAGAMENTOS),
    ])
  }

  /** Contratar: a cotação do fornecedor vira o custo final de um gasto planejado. */
  async function contratarFornecedor(fornecedorId: string, input: VendorContractInput) {
    const despesa = await $fetch<Despesa>(`/api/finance/vendors/${fornecedorId}/contract`, {
      method: 'POST',
      body: input,
    })
    await atualizarFinanceiro()
    return despesa
  }

  async function definirTetoDoOrcamento(orcamentoTotalCentavos: number | null) {
    const resposta = await $fetch<{ orcamento_total_centavos: number | null }>(
      '/api/finance/budget-total',
      { method: 'PATCH', body: { orcamentoTotalCentavos } },
    )
    await atualizarFinanceiro()
    return resposta
  }

  async function criarCategoria(input: BudgetCategoryInput) {
    const categoria = await $fetch<CategoriaOrcamento>('/api/finance/categories', {
      method: 'POST',
      body: input,
    })
    await atualizarFinanceiro()
    return categoria
  }

  async function criarCategoriasSugeridas() {
    const resposta = await $fetch<{ data: CategoriaOrcamento[] }>(
      '/api/finance/categories?sugeridas=1',
      { method: 'POST' },
    )
    await atualizarFinanceiro()
    return resposta.data
  }

  async function atualizarCategoria(id: string, input: BudgetCategoryPatch) {
    const categoria = await $fetch<CategoriaOrcamento>(`/api/finance/categories/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarFinanceiro()
    return categoria
  }

  /** Arquivar e restaurar são a mesma rota — só ela sabe voltar atrás. */
  async function arquivarCategoria(id: string, arquivada: boolean) {
    const categoria = await $fetch<CategoriaOrcamento>(`/api/finance/categories/${id}/archive`, {
      method: 'POST',
      body: { arquivada },
    })
    await atualizarFinanceiro()
    return categoria
  }

  async function excluirCategoria(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/finance/categories/${id}`, {
      method: 'DELETE',
    })
    await atualizarFinanceiro()
    return resposta
  }

  async function criarDespesa(input: ExpenseInput) {
    const despesa = await $fetch<Despesa>('/api/finance/expenses', { method: 'POST', body: input })
    await atualizarFinanceiro()
    return despesa
  }

  async function atualizarDespesa(id: string, input: ExpensePatch) {
    const despesa = await $fetch<Despesa>(`/api/finance/expenses/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarFinanceiro()
    return despesa
  }

  async function excluirDespesa(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/finance/expenses/${id}`, {
      method: 'DELETE',
    })
    await atualizarFinanceiro()
    return resposta
  }

  async function gerarParcelasDaDespesa(id: string, input: InstallmentsGenerateInput) {
    const resposta = await $fetch<{ data: ParcelaDespesa[] }>(
      `/api/finance/expenses/${id}/installments`,
      { method: 'POST', body: input },
    )
    await atualizarFinanceiro()
    return resposta.data
  }

  async function atualizarParcela(id: string, input: InstallmentPatch) {
    const parcela = await $fetch<ParcelaDespesa>(`/api/finance/installments/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarFinanceiro()
    return parcela
  }

  async function excluirParcela(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/finance/installments/${id}`, {
      method: 'DELETE',
    })
    await atualizarFinanceiro()
    return resposta
  }

  return {
    getResumo,
    getOrcamento,
    getPagamentos,
    contratarFornecedor,
    listCategorias,
    atualizarFinanceiro,
    definirTetoDoOrcamento,
    criarCategoria,
    criarCategoriasSugeridas,
    atualizarCategoria,
    arquivarCategoria,
    excluirCategoria,
    criarDespesa,
    atualizarDespesa,
    excluirDespesa,
    gerarParcelasDaDespesa,
    atualizarParcela,
    excluirParcela,
  }
}
