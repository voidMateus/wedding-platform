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
}

const { modelValue, title, description } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <DialogRoot :open="modelValue" @update:open="emit('update:modelValue', $event)">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity duration-200 data-[state=open]:opacity-100"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 scale-95 rounded-lg border border-border bg-surface p-6 opacity-0 shadow-lg transition-all duration-200 focus:outline-none data-[state=open]:scale-100 data-[state=open]:opacity-100"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="text-base font-semibold text-text">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-text-muted">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="rounded-md p-1 text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Fechar"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
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
