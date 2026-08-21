<script setup lang="ts">
// "Seja muito bem-vindo!" — continuação natural do Hero (Fase Linguagem
// Visual, Rodada 6): sem card, sem caixa, só tipografia refinada e muito
// espaço em branco (brief explícito do usuário). Não usa
// PublicEditorialSection de propósito — o tratamento de título aqui
// (uppercase tracked, menor) é deliberadamente diferente do padrão de
// "capítulo" das demais seções; é uma antessala, não um capítulo.
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const content = computed(() => resolveWeddingContent(wedding.config_conteudo))
</script>

<template>
  <section class="relative overflow-hidden bg-surface px-4 pb-24 pt-4 text-center sm:pb-32">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative mx-auto flex max-w-2xl flex-col items-center gap-5"
    >
      <PublicHeroFlourish class="text-secondary" />
      <h2 class="font-display text-2xl font-semibold uppercase tracking-[0.18em] text-heading sm:text-3xl">
        {{ content.welcomeTitle }}
      </h2>
      <span class="flex items-center gap-2" aria-hidden="true">
        <span class="h-px w-8 bg-secondary/60" />
        <span class="h-1 w-1 rotate-45 bg-secondary/70" />
        <span class="h-px w-8 bg-secondary/60" />
      </span>
      <p v-for="(paragraph, index) in content.welcomeParagraphs" :key="index" class="leading-relaxed text-body">
        {{ paragraph }}
      </p>
      <span class="text-lg text-primary" aria-hidden="true">♥</span>
    </div>
  </section>
</template>
