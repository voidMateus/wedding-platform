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
import { formatDatePtBR } from '#shared/utils/format-date'
import type { AdminTableColumn } from '~/types/table'
import type { DocumentoComVinculos } from '~/types/finance'
import { applyTableFilters, compareText, type ClientColumn } from '~/utils/table-rows'

definePageMeta({ layout: 'admin' })

const toast = useToast()

// O recorte por tipo é filtro de COLUNA, não fileira de chips: é atributo da
// linha, e o estado precisa morar na URL como nas outras telas do módulo — um
// link para "só os contratos" tem que sobreviver ao Voltar.
const colunas = computed<AdminTableColumn<DocumentoComVinculos>[]>(() => [
  { key: 'titulo', label: 'Documento', filter: { type: 'text', placeholder: 'Buscar' } },
  {
    key: 'tipo',
    label: 'Tipo',
    filter: {
      type: 'select',
      multiple: true,
      options: TIPOS_DOCUMENTO.map((tipo) => ({
        value: tipo,
        label: ROTULOS_TIPO_DOCUMENTO[tipo],
      })),
    },
  },
  { key: 'vinculo', label: 'Vínculo' },
  { key: 'data', label: 'Enviado em', sort: 'date' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const filters = useTableFilters(colunas)

const acessores: Record<string, ClientColumn<DocumentoComVinculos>> = {
  titulo: {
    value: (documento) => documento.titulo,
    compare: compareText((documento) => documento.titulo),
  },
  tipo: { value: (documento) => documento.tipo },
  data: { compare: compareText((documento) => documento.created_at) },
}

const {
  listDocuments,
  criarDocumentoDeLink,
  enviarDocumento,
  excluirDocumento,
  obterUrlDoDocumento,
} = useFinanceDocuments()

// A lista vem inteira e o recorte é da página: o endpoint aceita um tipo só, e
// o filtro de coluna é de múltipla escolha.
const { data, status, error, refresh } = listDocuments()

const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()
const { getOrcamento } = useFinance()
const { data: orcamento } = getOrcamento()

const despesas = computed(() =>
  (orcamento.value?.categorias ?? []).flatMap((categoria) => categoria.despesas),
)

const todos = computed(() => data.value?.data ?? [])

const documentos = computed(() =>
  applyTableFilters(todos.value, colunas.value, acessores, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

function vinculoDe(documento: DocumentoComVinculos): string {
  return (
    [documento.fornecedor?.nome, documento.despesa?.descricao].filter(Boolean).join(' · ') || '—'
  )
}

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
      v-else-if="todos.length === 0"
      icon="lucide:folder-open"
      title="Nenhum documento ainda"
      description="Envie o contrato assinado ou cole o link do arquivo que já está no seu Drive."
    >
      <UiButton @click="modalAberto = true">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar documento
      </UiButton>
    </UiEmptyState>

    <AdminPanel
      v-else
      title="Documentos do casamento"
      :meta="`${documentos.length} de ${todos.length}`"
    >
      <template #headerActions>
        <AdminTableFilterBar
          :filters="filters"
          :columns="colunas"
          group-label="Filtros de documentos"
        />
      </template>

      <AdminTable
        :columns="colunas"
        :rows="documentos"
        :filters="filters"
        row-clickable
        empty-label="Nenhum documento com esses filtros."
        @row-click="abrir"
      >
        <template #cell-titulo="{ row }">
          <div class="flex min-w-0 items-center gap-2">
            <Icon
              :name="row.url_externa ? 'lucide:link' : 'lucide:file-text'"
              class="h-4 w-4 shrink-0 text-text-muted"
            />
            <button
              type="button"
              class="max-w-full truncate text-left text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="abrir(row)"
            >
              {{ row.titulo }}
            </button>
          </div>
        </template>

        <template #cell-tipo="{ row }">
          <UiBadge tone="neutral">{{ tipoDocumentoLabel(row.tipo as never) }}</UiBadge>
        </template>

        <template #cell-vinculo="{ row }">
          <span class="block truncate text-text-muted">{{ vinculoDe(row) }}</span>
        </template>

        <template #cell-data="{ row }">
          <span class="num text-text-muted">{{ formatDatePtBR(row.created_at) }}</span>
        </template>

        <template #cell-acoes="{ row }">
          <div class="flex items-center justify-end gap-1">
            <AdminRowAction icon="lucide:external-link" label="Abrir" @click="abrir(row)" />
            <AdminRowAction
              icon="lucide:trash-2"
              label="Excluir documento"
              tone="danger"
              @click="paraExcluir = row"
            />
          </div>
        </template>

        <template #stacked="{ row }">
          <div class="flex flex-col gap-1 px-4 py-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-text">{{ row.titulo }}</span>
              <UiBadge tone="neutral">{{ tipoDocumentoLabel(row.tipo as never) }}</UiBadge>
            </div>
            <span class="truncate text-sm text-text-muted">{{ vinculoDe(row) }}</span>
            <div class="mt-1 flex items-center gap-2">
              <UiButton variant="outline" @click="abrir(row)">Abrir</UiButton>
              <AdminRowAction
                icon="lucide:trash-2"
                label="Excluir documento"
                tone="danger"
                @click="paraExcluir = row"
              />
            </div>
          </div>
        </template>
      </AdminTable>
    </AdminPanel>

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
