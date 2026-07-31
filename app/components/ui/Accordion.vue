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
  <AccordionRoot type="single" collapsible class="flex flex-col divide-y divide-border">
    <AccordionItem v-for="item in items" :key="item.id" :value="item.id">
      <AccordionHeader>
        <AccordionTrigger
          class="flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&[data-state=open]>span]:rotate-180"
        >
          {{ item.trigger }}
          <span class="shrink-0 text-text-muted transition-transform duration-200">
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden text-sm text-body">
        <p class="pb-4 leading-relaxed">{{ item.content }}</p>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
