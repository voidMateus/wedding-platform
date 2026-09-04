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
   * 'segmented' é o controle de largura cheia da tela de Configurações: as
   * abas dividem a régua em partes iguais dentro de uma moldura única e a
   * ativa é preenchida com a cor primária — a aba deixa de ser um filtro
   * discreto e passa a ser a navegação principal da tela. Continua sendo um
   * TabsRoot do Reka: só a pintura muda, então a navegação por setas e o par
   * aria-controls/aria-selected seguem de pé, que é o que um grupo de botões
   * com aria-pressed não entrega.
   */
  variant?: 'boxed' | 'segmented'
}

const { tabs, modelValue, variant = 'boxed' } = defineProps<Props>()

const LIST_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  boxed: 'inline-flex gap-1 rounded-lg border border-border bg-surface-muted p-1',
  // min-w-max: em tela estreita as abas mantêm a largura do próprio rótulo e
  // a moldura rola dentro do invólucro, em vez de comprimir o texto.
  segmented: 'flex w-full min-w-max gap-1 rounded-lg border border-border bg-surface-elevated p-1',
}

const TRIGGER_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  boxed:
    'rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-brand hover:text-text data-[state=active]:bg-surface-elevated data-[state=active]:text-primary data-[state=active]:shadow-sm',
  segmented:
    'flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-brand hover:bg-surface-muted hover:text-text data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
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
    <div :class="variant === 'segmented' && 'no-scrollbar overflow-x-auto'">
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
    </div>
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
