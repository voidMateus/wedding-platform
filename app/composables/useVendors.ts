import type { VendorInput, VendorPatch } from '#shared/schemas/finance'
import type { Fornecedor, FornecedorComSituacao } from '~/types/finance'

const CHAVE_FORNECEDORES = 'finance-vendors'

/** Fornecedores: pipeline, contatos e a situação financeira derivada. */
export function useVendors() {
  function listVendors() {
    return useFetch<{ data: FornecedorComSituacao[] }>('/api/finance/vendors', {
      key: CHAVE_FORNECEDORES,
    })
  }

  async function atualizarLista() {
    await refreshNuxtData(CHAVE_FORNECEDORES)
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

  return { listVendors, atualizarLista, criarFornecedor, atualizarFornecedor, excluirFornecedor }
}
