<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'

interface Props {
  modelValue: boolean
  title: string
  description?: string
  /** 'lg' é mais largo (ex.: lightbox de foto, formulários de várias colunas) — 'md' (default) preserva o tamanho já usado em toda a plataforma. */
  size?: 'md' | 'lg'
  /**
   * Onde a rolagem acontece quando o conteúdo passa da altura da janela.
   * 'body' (default): o modal rola o slot inteiro.
   * 'content': o slot recebe a altura disponível e controla a própria rolagem
   * — para conteúdo que precisa fixar cabeçalho/rodapé próprios (ex.: o wizard
   * de convidado, cujos botões de navegação não podem sair da vista).
   */
  scroll?: 'body' | 'content'
}

const { modelValue, title, description, size = 'md', scroll = 'body' } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
}

// -mx-6/px-6 devolve o respiro lateral que o overflow comeria: sem isso o anel
// de foco dos campos encosta na borda da área rolável.
const BODY_CLASSES: Record<NonNullable<Props['scroll']>, string> = {
  body: '-mx-6 min-h-0 flex-1 overflow-y-auto px-6',
  content: 'flex min-h-0 flex-1 flex-col',
}
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity duration-200 data-[state=open]:opacity-100"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full -translate-x-1/2 -translate-y-1/2 scale-95 flex-col rounded-lg border border-border bg-surface p-6 opacity-0 shadow-lg transition-all duration-200 focus:outline-none data-[state=open]:scale-100 data-[state=open]:opacity-100"
        :class="SIZE_CLASSES[size]"
      >
        <div class="mb-4 flex shrink-0 items-start justify-between gap-4">
          <div>
            <DialogTitle class="text-base font-semibold text-text">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-text-muted">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Fechar"
          >
            <Icon name="lucide:x" class="h-5 w-5" />
          </DialogClose>
        </div>

        <div :class="BODY_CLASSES[scroll]">
          <slot />
        </div>

        <div v-if="$slots.footer" class="mt-6 flex shrink-0 justify-end gap-2">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
