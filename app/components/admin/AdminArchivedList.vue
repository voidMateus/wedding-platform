<!--
  A gaveta de arquivados: uma linha discreta no fim da tela que abre a lista do
  que foi tirado de circulação, com o caminho de volta.

  Gaveta, e não painel: arquivar é reversível e raro de consultar, então o
  bloco não pode competir com a lista viva logo acima — mas precisa existir,
  porque item arquivado sem caminho de volta é item perdido.

  Nasceu duplicado em Orçamento (categorias) e Fornecedores (cotações), palavra
  por palavra nos dois — dois contextos reais, que é o que promove um bloco a
  componente.
-->
<script setup lang="ts">
export interface ItemArquivado {
  id: string
  nome: string
  /** Uma informação de apoio, à direita do nome (ex.: "orçado R$ 8.000,00"). */
  detalhe?: string | null
}

interface Props {
  itens: readonly ItemArquivado[]
  /** Rótulos da contagem: "categoria arquivada" / "categorias arquivadas". */
  singular: string
  plural: string
}

const { itens, singular, plural } = defineProps<Props>()

const emit = defineEmits<{
  restaurar: [id: string]
}>()

const aberto = ref(false)
</script>

<template>
  <div v-if="itens.length > 0" class="rounded-lg border border-border bg-surface-elevated">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
      :aria-expanded="aberto"
      @click="aberto = !aberto"
    >
      <Icon
        :name="aberto ? 'lucide:chevron-down' : 'lucide:chevron-right'"
        class="h-4 w-4 shrink-0"
      />
      <Icon name="lucide:archive" class="h-4 w-4 shrink-0" />
      {{ itens.length }} {{ itens.length === 1 ? singular : plural }}
    </button>

    <ul v-if="aberto" class="divide-y divide-border border-t border-border">
      <li
        v-for="item in itens"
        :key="item.id"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
      >
        <span class="min-w-0 flex-1 truncate text-sm text-text-muted">{{ item.nome }}</span>
        <span v-if="item.detalhe" class="num text-xs text-text-muted">{{ item.detalhe }}</span>
        <UiButton size="sm" variant="ghost" @click="emit('restaurar', item.id)">
          Restaurar
        </UiButton>
      </li>
    </ul>
  </div>
</template>
