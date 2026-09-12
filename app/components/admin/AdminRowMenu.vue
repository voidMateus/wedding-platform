<!--
  O menu de ações de uma linha de tabela.

  Existe quando a linha passa de ~3 controles: aí a fileira de ícones vira o
  elemento mais pesado da tela, repetida linha a linha, e a ação mais
  consequente fica do mesmo tamanho da menos. O menu troca um clique direto por
  dois — o que só compensa para o que NÃO é a ação principal da linha.

  Regra de uso: a ação que a linha existe para oferecer (contratar um
  fornecedor, dar baixa num pagamento) continua fora, com rótulo. Editar,
  arquivar, excluir e afins entram aqui.

  `tone="danger"` pinta só o item, nunca o gatilho: o vermelho no menu fechado
  anunciaria perigo numa linha onde nada foi escolhido ainda.
-->
<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

export interface AdminRowMenuItem {
  /** Chave estável — o `key` do laço, nunca o índice. */
  key: string
  label: string
  icon?: string
  tone?: 'default' | 'danger'
  /** Item desabilitado continua visível, com o motivo no `title`. */
  disabled?: boolean
  title?: string
  /** Uma régua acima deste item — separa o destrutivo do resto. */
  separarAntes?: boolean
}

interface Props {
  items: readonly AdminRowMenuItem[]
  /** Rótulo acessível do gatilho ("Ações de Buffet Recanto"). */
  label: string
}

const { items, label } = defineProps<Props>()

const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      :title="label"
      :aria-label="label"
      class="relative inline-flex items-center justify-center rounded-md p-1.5 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-surface-muted data-[state=open]:text-text"
    >
      <Icon name="lucide:ellipsis" class="h-4 w-4" />
    </DropdownMenuTrigger>

    <!-- z-60 pelo mesmo motivo de UiSelect e do filtro de coluna: listas do
         admin também aparecem dentro de modal (z-50). -->
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="4"
        class="z-60 min-w-44 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
      >
        <template v-for="item in items" :key="item.key">
          <DropdownMenuSeparator v-if="item.separarAntes" class="my-1 h-px bg-border" />
          <DropdownMenuItem
            :disabled="item.disabled"
            :title="item.title"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-brand data-[highlighted]:bg-surface-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
            :class="item.tone === 'danger' ? 'text-danger' : 'text-text'"
            @select="emit('select', item.key)"
          >
            <Icon v-if="item.icon" :name="item.icon" class="h-4 w-4 shrink-0" />
            {{ item.label }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
