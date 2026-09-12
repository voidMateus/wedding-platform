import type { DocumentLinkInput, DocumentPatch, TipoDocumento } from '#shared/schemas/finance'
import type { Documento, DocumentoComVinculos } from '~/types/finance'

const CHAVE_DOCUMENTOS = 'finance-documents'

/**
 * Documentos — entidade única compartilhada, sempre lida pelo mesmo endpoint
 * com um recorte diferente. É o que permite a mesma lista aparecer dentro de
 * um fornecedor sem uma segunda tela.
 */
export function useFinanceDocuments() {
  /**
   * TODOS os documentos do casamento, numa requisição só — o recorte por
   * fornecedor ou por gasto é da tela.
   *
   * O filtro chegou a ser parâmetro daqui, e isso era uma armadilha: duas
   * chamadas com a MESMA chave de cache, distinguidas apenas pela query,
   * compartilham a resposta no Nuxt. Na prática a ficha de um gasto mostrava os
   * documentos de outro, sem erro nenhum para acusar. A lista de um casamento
   * cabe inteira na memória; o recorte é um `filter` na tela.
   */
  function listDocuments() {
    return useFetch<{ data: DocumentoComVinculos[] }>('/api/finance/documents', {
      key: CHAVE_DOCUMENTOS,
    })
  }

  async function atualizarLista() {
    await refreshNuxtData(CHAVE_DOCUMENTOS)
  }

  async function criarDocumentoDeLink(input: DocumentLinkInput) {
    const documento = await $fetch<Documento>('/api/finance/documents', {
      method: 'POST',
      body: input,
    })
    await atualizarLista()
    return documento
  }

  /**
   * Upload do arquivo. FormData, não JSON: o arquivo vai como binário e os
   * metadados como campos — é o endpoint que monta o caminho no bucket, nunca
   * o client.
   */
  async function enviarDocumento(
    arquivo: File,
    campos: {
      titulo: string
      tipo: TipoDocumento
      fornecedorId?: string | null
      despesaId?: string | null
    },
  ) {
    const form = new FormData()
    form.append('file', arquivo)
    form.append('titulo', campos.titulo)
    form.append('tipo', campos.tipo)
    if (campos.fornecedorId) form.append('fornecedorId', campos.fornecedorId)
    if (campos.despesaId) form.append('despesaId', campos.despesaId)

    const documento = await $fetch<Documento>('/api/finance/documents/upload', {
      method: 'POST',
      body: form,
    })
    await atualizarLista()
    return documento
  }

  async function atualizarDocumento(id: string, input: DocumentPatch) {
    const documento = await $fetch<Documento>(`/api/finance/documents/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarLista()
    return documento
  }

  async function excluirDocumento(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/finance/documents/${id}`, {
      method: 'DELETE',
    })
    await atualizarLista()
    return resposta
  }

  /** Link de abertura: assinado e de vida curta para arquivo, direto para link externo. */
  async function obterUrlDoDocumento(id: string) {
    return $fetch<{ url: string; externo: boolean }>(`/api/finance/documents/${id}/url`)
  }

  return {
    listDocuments,
    atualizarLista,
    criarDocumentoDeLink,
    enviarDocumento,
    atualizarDocumento,
    excluirDocumento,
    obterUrlDoDocumento,
  }
}
