<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'

export interface AccordionItemData {
  id: string
  trigger: string
  content: string
}

interface Props {
  items: AccordionItemData[]
}

defineProps<Props>()
</script>

<template>
  <AccordionRoot type="single" collapsible class="flex flex-col gap-3">
    <AccordionItem
      v-for="item in items"
      :key="item.id"
      :value="item.id"
      class="overflow-hidden rounded-xl border border-primary/10 bg-surface-elevated shadow-sm"
    >
      <AccordionHeader>
        <AccordionTrigger
          class="flex w-full items-center justify-between gap-4 p-5 text-left font-medium text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&[data-state=open]>span]:rotate-180"
        >
          {{ item.trigger }}
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200"
          >
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden text-sm text-body">
        <p class="px-5 pb-5 leading-relaxed">{{ item.content }}</p>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
