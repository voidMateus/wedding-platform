<!--
  A lista de documentos — componente, não tela.

  É o que permite a MESMA lista aparecer na tela central e, filtrada, dentro de
  um fornecedor ou de uma despesa: "entidade única compartilhada, exibida
  filtrada dentro de cada área" (plano do Hub). Uma segunda lista por área é
  como elas divergiriam no primeiro ajuste.
-->
<script setup lang="ts">
import { formatDatePtBR } from '#shared/utils/format-date'
import type { DocumentoComVinculos } from '~/types/finance'

interface Props {
  documentos: DocumentoComVinculos[]
  /** Esconde as colunas de vínculo quando a lista já está dentro do vínculo. */
  compacta?: boolean
}

const { documentos, compacta = false } = defineProps<Props>()

const emit = defineEmits<{
  abrir: [documento: DocumentoComVinculos]
  excluir: [documento: DocumentoComVinculos]
}>()

function tamanhoLegivel(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <ul class="divide-y divide-border">
    <li
      v-for="documento in documentos"
      :key="documento.id"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
    >
      <Icon
        :name="documento.url_externa ? 'lucide:link' : 'lucide:file-text'"
        class="h-4 w-4 shrink-0 text-text-muted"
      />

      <div class="min-w-0 flex-1">
        <button
          type="button"
          class="block max-w-full truncate text-left text-sm text-text hover:text-primary"
          @click="emit('abrir', documento)"
        >
          {{ documento.titulo }}
        </button>
        <p v-if="!compacta" class="truncate text-xs text-text-muted">
          <template v-if="documento.fornecedor">{{ documento.fornecedor.nome }}</template>
          <template v-if="documento.fornecedor && documento.despesa"> · </template>
          <template v-if="documento.despesa">{{ documento.despesa.descricao }}</template>
        </p>
      </div>

      <UiBadge tone="neutral">{{ tipoDocumentoLabel(documento.tipo as never) }}</UiBadge>

      <span class="hidden text-xs text-text-muted sm:inline">
        {{ formatDatePtBR(documento.created_at) }}
        <template v-if="documento.tamanho_bytes">
          · {{ tamanhoLegivel(documento.tamanho_bytes) }}
        </template>
      </span>

      <AdminRowAction icon="lucide:external-link" label="Abrir" @click="emit('abrir', documento)" />
      <AdminRowAction
        icon="lucide:trash-2"
        label="Excluir documento"
        tone="danger"
        @click="emit('excluir', documento)"
      />
    </li>
  </ul>
</template>
