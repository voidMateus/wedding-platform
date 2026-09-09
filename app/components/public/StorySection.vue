<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  /** Fundo da seção — resolvido pela página (resolveHomeSections), nunca fixo aqui. */
  tone?: 'default' | 'muted'
}

const { wedding, tone = 'default' } = defineProps<Props>()

const content = computed(() => resolveWeddingContent(wedding.config_conteudo))

// Foto própria da seção — independente da foto de capa do Hero (CLAUDE.md,
// seção 22.3; separadas a pedido do casal, cada uma é uma foto diferente).
// Totalmente opcional: sem foto, o layout centralizado não é um "menos" da
// versão com foto, é um segundo tratamento pensado de propósito (mesmo
// princípio já aplicado ao Hero).
const storyImageUrl = computed(() => {
  const theme = (wedding.config_tema ?? {}) as Partial<ThemeConfig>
  return theme.storyImageUrl ?? null
})

// Ponto de foco (enquadramento) escolhido pelo casal no upload — CLAUDE.md,
// seção 22.2. Default 50/50 = centro.
const storyFocalPosition = computed(() => {
  const theme = (wedding.config_tema ?? {}) as Partial<ThemeConfig>
  return `${theme.storyFocalX ?? 50}% ${theme.storyFocalY ?? 50}%`
})
</script>

<template>
  <PublicEditorialSection
    id="historia"
    eyebrow="Como tudo começou"
    title="Nossa História"
    :tone="tone"
  >
    <!--
      Marcos, quando o casal os preencheu: a fileira de cartões do protótipo do
      convite. Ganha da foto e do texto corrido porque é a forma mais
      deliberada das três — quem escreveu três marcos escolheu contar a
      história assim.
    -->
    <div
      v-if="content.storyMilestones.length"
      class="grid gap-6"
      :class="content.storyMilestones.length > 1 ? 'md:grid-cols-3' : 'mx-auto max-w-xl'"
    >
      <article
        v-for="milestone in content.storyMilestones"
        :key="`${milestone.label}-${milestone.title}`"
        class="rounded-xl border border-border/70 bg-surface-elevated p-6 text-left"
      >
        <span class="text-[10px] uppercase tracking-[0.3em] text-ornament">
          {{ milestone.label }}
        </span>
        <h3 class="mt-2 font-display text-xl text-heading">{{ milestone.title }}</h3>
        <p class="mt-3 text-sm leading-relaxed text-text-muted">{{ milestone.text }}</p>
      </article>
    </div>

    <div v-else-if="storyImageUrl" class="grid gap-10 sm:grid-cols-2 sm:items-center">
      <NuxtImg
        :src="storyImageUrl"
        :alt="`Foto de ${wedding.nomes_noivos}`"
        class="aspect-[4/5] w-full rounded-xl object-cover"
        :style="{ objectPosition: storyFocalPosition }"
        sizes="sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw"
        loading="lazy"
      />
      <div class="flex flex-col gap-4 text-body">
        <p
          v-for="(paragraph, index) in content.storyParagraphs"
          :key="index"
          class="leading-relaxed"
        >
          {{ paragraph }}
        </p>
      </div>
    </div>

    <div v-else class="mx-auto flex max-w-2xl flex-col gap-4 text-center text-body">
      <p v-for="(paragraph, index) in content.storyParagraphs" :key="index" class="leading-relaxed">
        {{ paragraph }}
      </p>
    </div>
  </PublicEditorialSection>
</template>
