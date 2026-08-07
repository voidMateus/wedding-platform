<script setup lang="ts">
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const content = computed(() => resolveWeddingContent(wedding.content_config))

const items = computed(() =>
  content.value.faqItems.map((faq, index) => ({
    id: `faq-${index}`,
    trigger: faq.question,
    content: faq.answer,
  })),
)
</script>

<template>
  <PublicEditorialSection
    v-if="items.length"
    id="faq"
    eyebrow="Dúvidas comuns"
    title="Perguntas Frequentes"
    tone="muted"
  >
    <div class="mx-auto w-full max-w-2xl">
      <UiAccordion :items="items" />
    </div>
  </PublicEditorialSection>
</template>
