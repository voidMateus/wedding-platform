<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

export interface TabItem {
  id: string
  label: string
}

interface Props {
  tabs: TabItem[]
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <TabsRoot
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', String(value))"
  >
    <TabsList class="inline-flex gap-1 rounded-lg border border-border bg-surface-muted p-1">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.id"
        :value="tab.id"
        class="rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:bg-surface-elevated data-[state=active]:text-primary data-[state=active]:shadow-sm"
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
