<script setup lang="ts">
// "Seja muito bem-vindo!" — continuação natural do Hero (Fase Linguagem
// Visual, Rodada 6): sem card, sem caixa, só tipografia refinada e muito
// espaço em branco (brief explícito do usuário). Não usa
// PublicEditorialSection de propósito — o tratamento de título aqui
// (uppercase tracked, menor) é deliberadamente diferente do padrão de
// "capítulo" das demais seções; é uma antessala, não um capítulo.
import type { ThemeConfig } from '#shared/schemas/theme'
import { WELCOME_CONTENT } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

// Mesmo toggle das ilustrações do Hero — uma decisão só do casal cobre as
// duas áreas (theme_config.showHeroBotanicals).
const showBotanicals = computed(
  () => ((wedding.theme_config ?? {}) as Partial<ThemeConfig>).showHeroBotanicals ?? true,
)
</script>

<template>
  <section class="relative overflow-hidden bg-surface px-4 pb-24 pt-4 text-center sm:pb-32">
    <template v-if="showBotanicals">
      <PublicBotanicalBranch
        data-test="welcome-botanical"
        class="pointer-events-none absolute -bottom-10 -left-10 h-44 w-auto -rotate-12 text-secondary/30 sm:h-56"
      />
      <PublicBotanicalBranch
        data-test="welcome-botanical"
        class="pointer-events-none absolute -bottom-10 -right-10 h-44 w-auto -scale-x-100 -rotate-12 text-secondary/30 sm:h-56"
      />
    </template>

    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative mx-auto flex max-w-2xl flex-col items-center gap-5"
    >
      <PublicHeroFlourish class="text-secondary" />
      <h2 class="font-display text-2xl font-semibold uppercase tracking-[0.18em] text-heading sm:text-3xl">
        {{ WELCOME_CONTENT.title }}
      </h2>
      <span class="flex items-center gap-2" aria-hidden="true">
        <span class="h-px w-8 bg-secondary/60" />
        <span class="h-1 w-1 rotate-45 bg-secondary/70" />
        <span class="h-px w-8 bg-secondary/60" />
      </span>
      <p v-for="(paragraph, index) in WELCOME_CONTENT.paragraphs" :key="index" class="leading-relaxed text-body">
        {{ paragraph }}
      </p>
      <span class="text-lg text-primary" aria-hidden="true">♥</span>
    </div>
  </section>
</template>
