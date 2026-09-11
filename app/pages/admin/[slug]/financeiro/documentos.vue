<!--
  Documentos — contratos, comprovantes e referências.

  A lista é um componente que recebe filtro, não uma tela fechada: é isso que
  vai permitir a mesma lista aparecer dentro de um fornecedor ou de uma despesa
  sem duplicar tela.

  Arquivo enviado abre por URL assinada de vida curta (o bucket é privado);
  link externo abre direto.
-->
<script setup lang="ts">
import {
  TIPOS_DOCUMENTO,
  ROTULOS_TIPO_DOCUMENTO,
  type TipoDocumento,
} from '#shared/schemas/finance'
import type { DocumentoComVinculos } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const toast = useToast()
const filtroTipo = ref<TipoDocumento | ''>('')

const {
  listDocuments,
  criarDocumentoDeLink,
  enviarDocumento,
  excluirDocumento,
  obterUrlDoDocumento,
} = useFinanceDocuments()

const { data, status, error, refresh } = listDocuments(
  computed(() => (filtroTipo.value ? { tipo: filtroTipo.value } : {})),
)

const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()
const { getOrcamento } = useFinance()
const { data: orcamento } = getOrcamento()

const despesas = computed(() =>
  (orcamento.value?.categorias ?? []).flatMap((categoria) => categoria.despesas),
)

const documentos = computed(() => data.value?.data ?? [])

const modalAberto = ref(false)
const paraExcluir = ref<DocumentoComVinculos | null>(null)

async function abrir(documento: DocumentoComVinculos) {
  try {
    const { url } = await obterUrlDoDocumento(documento.id)
    window.open(url, '_blank', 'noopener')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível abrir o documento.'))
  }
}

async function salvarArquivo(payload: {
  arquivo: File
  titulo: string
  tipo: TipoDocumento
  fornecedorId: string | null
  despesaId: string | null
}) {
  try {
    await enviarDocumento(payload.arquivo, {
      titulo: payload.titulo,
      tipo: payload.tipo,
      fornecedorId: payload.fornecedorId,
      despesaId: payload.despesaId,
    })
    modalAberto.value = false
    toast.success('Documento enviado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível enviar o documento.'))
  }
}

async function salvarLink(payload: {
  titulo: string
  tipo: TipoDocumento
  urlExterna: string
  fornecedorId: string | null
  despesaId: string | null
}) {
  try {
    await criarDocumentoDeLink(payload)
    modalAberto.value = false
    toast.success('Documento salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o documento.'))
  }
}

async function confirmarExclusao() {
  const documento = paraExcluir.value
  if (!documento) return
  try {
    await excluirDocumento(documento.id)
    paraExcluir.value = null
    toast.success('Documento excluído.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir o documento.'))
  }
}
</script>

<template>
  <AdminSection
    title="Documentos"
    description="Contratos, comprovantes e referências — no lugar do PDF perdido no e-mail."
    :meta="`${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'}`"
  >
    <template #actions>
      <UiButton @click="modalAberto = true">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar documento
      </UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar os documentos"
      description="Tente novamente em alguns instantes."
    >
      <UiButton variant="outline" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="documentos.length === 0 && filtroTipo === ''"
      icon="lucide:folder-open"
      title="Nenhum documento ainda"
      description="Envie o contrato assinado ou cole o link do arquivo que já está no seu Drive."
    >
      <UiButton @click="modalAberto = true">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar documento
      </UiButton>
    </UiEmptyState>

    <!-- Os filtros só existem quando há o que filtrar: soltos acima da cadeia
         de estados, eles apareciam durante o carregamento e por cima do "nenhum
         documento ainda" — seis recortes para recortar nada. -->
    <template v-else>
      <div class="flex flex-wrap gap-2">
        <UiChip label="Todos" clickable :selected="filtroTipo === ''" @click="filtroTipo = ''" />
        <UiChip
          v-for="tipo in TIPOS_DOCUMENTO"
          :key="tipo"
          :label="ROTULOS_TIPO_DOCUMENTO[tipo]"
          clickable
          :selected="filtroTipo === tipo"
          @click="filtroTipo = tipo"
        />
      </div>

      <AdminPanel v-if="documentos.length > 0">
        <AdminFinanceDocumentList
          :documentos="documentos"
          @abrir="abrir"
          @excluir="paraExcluir = $event"
        />
      </AdminPanel>

      <UiEmptyState
        v-else
        icon="lucide:folder-open"
        title="Nenhum documento desse tipo"
        description="Troque o filtro acima para ver os outros."
      >
        <UiButton variant="ghost" @click="filtroTipo = ''">Ver todos</UiButton>
      </UiEmptyState>
    </template>

    <AdminFinanceDocumentModal
      v-model="modalAberto"
      :fornecedores="fornecedores?.data ?? []"
      :despesas="despesas"
      @enviar-arquivo="salvarArquivo"
      @salvar-link="salvarLink"
    />

    <UiModal
      :model-value="Boolean(paraExcluir)"
      title="Excluir documento"
      description="O arquivo é apagado de vez — não fica escondido em lugar nenhum."
      @update:model-value="paraExcluir = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="paraExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
