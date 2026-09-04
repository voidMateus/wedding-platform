<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

export interface TabItem {
  id: string
  label: string
}

interface Props {
  tabs: TabItem[]
  modelValue: string
  /**
   * 'chips' usa a mesma linguagem da barra de filtros do admin
   * (AdminFilterChips): 32px, sem moldura em volta, ativo por fundo sutil.
   * Continua sendo um TabsRoot do Reka — só a pintura muda, então a
   * navegação por setas e o par aria-controls/aria-selected seguem de pé,
   * que é o que um grupo de botões com aria-pressed não entrega.
   */
  variant?: 'boxed' | 'chips'
}

const { tabs, modelValue, variant = 'boxed' } = defineProps<Props>()

const LIST_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  boxed: 'inline-flex gap-1 rounded-lg border border-border bg-surface-muted p-1',
  chips: 'flex flex-wrap gap-1',
}

const TRIGGER_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  boxed:
    'rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-brand hover:text-text data-[state=active]:bg-surface-elevated data-[state=active]:text-primary data-[state=active]:shadow-sm',
  chips:
    'h-8 rounded-lg px-3 text-xs font-medium text-text-muted transition-brand hover:bg-surface-muted hover:text-text data-[state=active]:bg-surface-muted data-[state=active]:text-text',
}

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <TabsRoot
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', String(value))"
  >
    <TabsList :class="LIST_CLASSES[variant]">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.id"
        :value="tab.id"
        class="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="TRIGGER_CLASSES[variant]"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-for="tab in tabs"
      :key="tab.id"
      :value="tab.id"
      class="mt-6 focus-visible:outline-none"
    >
      <slot :name="tab.id" />
    </TabsContent>
  </TabsRoot>
</template>
