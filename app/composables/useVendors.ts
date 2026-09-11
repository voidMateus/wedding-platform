import type { VendorInput, VendorPatch } from '#shared/schemas/finance'
import type { Fornecedor, FornecedorComSituacao } from '~/types/finance'

const CHAVE_FORNECEDORES = 'finance-vendors'

/**
 * Fornecedores: pipeline, contatos e a situação financeira derivada.
 *
 * A listagem traz ATIVOS E ARQUIVADOS numa requisição só, e quem consome
 * separa os dois — duas chamadas para a mesma rota, distinguidas só por uma
 * query, davam empate de cache e a lista de arquivados chegava vazia sem
 * nenhum erro para acusar.
 */
export function useVendors() {
  function listVendors() {
    return useFetch<{ data: FornecedorComSituacao[] }>('/api/finance/vendors?incluirArquivados=1', {
      key: CHAVE_FORNECEDORES,
    })
  }

  async function atualizarLista() {
    await refreshNuxtData(CHAVE_FORNECEDORES)
  }

  /** Arquivar e restaurar são a mesma rota — só ela sabe voltar atrás. */
  async function arquivarFornecedor(id: string, arquivado: boolean) {
    const fornecedor = await $fetch<Fornecedor>(`/api/finance/vendors/${id}/archive`, {
      method: 'POST',
      body: { arquivado },
    })
    await atualizarLista()
    return fornecedor
  }

  async function criarFornecedor(input: VendorInput) {
    const fornecedor = await $fetch<Fornecedor>('/api/finance/vendors', {
      method: 'POST',
      body: input,
    })
    await atualizarLista()
    return fornecedor
  }

  async function atualizarFornecedor(id: string, input: VendorPatch) {
    const fornecedor = await $fetch<Fornecedor>(`/api/finance/vendors/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarLista()
    return fornecedor
  }

  async function excluirFornecedor(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/finance/vendors/${id}`, {
      method: 'DELETE',
    })
    await atualizarLista()
    return resposta
  }

  return {
    listVendors,
    atualizarLista,
    arquivarFornecedor,
    criarFornecedor,
    atualizarFornecedor,
    excluirFornecedor,
  }
}
