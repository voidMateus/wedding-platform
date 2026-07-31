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
  /** 'lg' é mais largo (ex.: lightbox de foto) — 'md' (default) preserva o tamanho já usado em toda a plataforma. */
  size?: 'md' | 'lg'
}

const { modelValue, title, description, size = 'md' } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
}
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity duration-200 data-[state=open]:opacity-100"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 scale-95 rounded-lg border border-border bg-surface p-6 opacity-0 shadow-lg transition-all duration-200 focus:outline-none data-[state=open]:scale-100 data-[state=open]:opacity-100"
        :class="SIZE_CLASSES[size]"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
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

        <slot />

        <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
