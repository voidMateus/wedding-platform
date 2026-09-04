<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from 'reka-ui'

export interface AccordionItemData {
  id: string
  trigger: string
  /** Linha de apoio abaixo do título — só a variante 'plain' desenha. */
  hint?: string
  /** Ignorado quando o slot com escopo #content é usado (conteúdo rico, ex.: formulários). */
  content?: string
}

interface Props {
  items: AccordionItemData[]
  /**
   * 'card' é o acordeão premium do site público: moldura arredondada, sombra
   * e chevron dentro de um disco na cor primária. 'plain' é a linha de
   * configuração: moldura de 1px, título com linha de apoio, chevron solto e
   * fundo sutil quando aberto — vários itens empilhados numa mesma seção sem
   * que cada um pareça um cartão independente.
   */
  variant?: 'card' | 'plain'
  /** Item aberto no primeiro render — o resto começa fechado. */
  defaultOpenId?: string
}

const { items, variant = 'card', defaultOpenId } = defineProps<Props>()

const ROOT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  card: 'flex flex-col gap-3',
  plain: 'flex flex-col gap-2',
}

const ITEM_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  card: 'overflow-hidden rounded-xl border border-primary/10 bg-surface-elevated shadow-sm',
  // O item aberto se destaca pela BORDA, nunca por preenchimento: o cartão de
  // seção é branco (`surface-elevated`) e os campos dentro do item são
  // off-white (`surface`); um terceiro tom quente no meio dos dois deixava a
  // pilha inteira turva, sem dizer qual item está aberto (achado do usuário
  // na tela de Mensagens do site). A borda na cor primária resolve o mesmo
  // problema com um sinal mais forte e um tom a menos.
  plain:
    'overflow-hidden rounded-md border border-border transition-brand data-[state=open]:border-primary/35',
}

const TRIGGER_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  card: 'p-5 font-medium text-heading',
  plain: 'px-4 py-3',
}

const FALLBACK_CONTENT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  card: 'px-5 pb-5 leading-relaxed',
  plain: 'px-4 pb-3 leading-relaxed',
}
</script>

<template>
  <AccordionRoot
    type="single"
    collapsible
    :default-value="defaultOpenId"
    :class="ROOT_CLASSES[variant]"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.id"
      :value="item.id"
      :class="ITEM_CLASSES[variant]"
    >
      <AccordionHeader>
        <!-- span:last-child, não >span: na variante 'plain' o título também é
             um span, e o seletor genérico girava o texto junto com o chevron. -->
        <AccordionTrigger
          class="flex w-full items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&[data-state=open]>span:last-child]:rotate-180"
          :class="TRIGGER_CLASSES[variant]"
        >
          <span v-if="variant === 'plain'" class="min-w-0">
            <span class="block font-display text-sm font-semibold text-text">
              {{ item.trigger }}
            </span>
            <span v-if="item.hint" class="block text-xs text-text-muted">{{ item.hint }}</span>
          </span>
          <template v-else>{{ item.trigger }}</template>

          <span
            v-if="variant === 'plain'"
            class="shrink-0 text-text-muted transition-transform duration-200"
          >
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </span>
          <span
            v-else
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200"
          >
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden text-sm text-body">
        <slot name="content" :item="item">
          <p :class="FALLBACK_CONTENT_CLASSES[variant]">{{ item.content }}</p>
        </slot>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
