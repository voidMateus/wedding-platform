import type {
  BudgetCategoryInput,
  BudgetCategoryPatch,
  ExpenseInput,
  ExpensePatch,
  InstallmentPatch,
  InstallmentsGenerateInput,
} from '#shared/schemas/finance'
import type {
  CategoriaComDespesas,
  CategoriaOrcamento,
  Despesa,
  ParcelaDespesa,
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

export function useFinance() {
  function getResumo() {
    return useFetch<ResumoFinanceiro>('/api/finance/summary', { key: CHAVE_RESUMO_FINANCEIRO })
  }

  function getOrcamento() {
    return useFetch<OrcamentoResponse>('/api/finance/expenses', { key: CHAVE_ORCAMENTO })
  }

  function listCategorias() {
    return useFetch<{ data: CategoriaOrcamento[] }>('/api/finance/categories', {
      key: 'finance-categories',
    })
  }

  /** Recarrega as duas telas de uma vez — toda mutação mexe nos dois números. */
  async function atualizarFinanceiro() {
    await Promise.all([refreshNuxtData(CHAVE_RESUMO_FINANCEIRO), refreshNuxtData(CHAVE_ORCAMENTO)])
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
    listCategorias,
    atualizarFinanceiro,
    definirTetoDoOrcamento,
    criarCategoria,
    criarCategoriasSugeridas,
    atualizarCategoria,
    excluirCategoria,
    criarDespesa,
    atualizarDespesa,
    excluirDespesa,
    gerarParcelasDaDespesa,
    atualizarParcela,
    excluirParcela,
  }
}
