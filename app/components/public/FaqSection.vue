<script setup lang="ts">
import { FAQ_CONTENT } from '#shared/wedding-content'

const items = FAQ_CONTENT.map((faq, index) => ({
  id: `faq-${index}`,
  trigger: faq.question,
  content: faq.answer,
}))
</script>

<template>
  <PublicEditorialSection id="faq" eyebrow="Dúvidas comuns" title="Perguntas Frequentes" tone="muted">
    <div class="mx-auto w-full max-w-2xl">
      <UiAccordion :items="items" />
    </div>
  </PublicEditorialSection>
</template>
