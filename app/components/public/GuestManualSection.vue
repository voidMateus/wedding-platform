<script setup lang="ts">
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  /** Fundo da seção — resolvido pela página (resolveHomeSections), nunca fixo aqui. */
  tone?: 'default' | 'muted'
}

const { wedding, tone = 'default' } = defineProps<Props>()

const content = computed(() => resolveWeddingContent(wedding.config_conteudo))
</script>

<template>
  <PublicEditorialSection
    v-if="content.guestManualTopics.length"
    id="manual-convidados"
    eyebrow="Informações úteis"
    title="Manual dos Convidados"
    :tone="tone"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-8">
      <p class="text-center leading-relaxed text-body">{{ content.guestManualIntro }}</p>
      <PublicTopicGrid :topics="content.guestManualTopics" />
    </div>
  </PublicEditorialSection>
</template>
