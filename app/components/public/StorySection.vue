<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { STORY_CONTENT } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

// Foto própria da seção — independente da foto de capa do Hero (CLAUDE.md,
// seção 22.3; separadas a pedido do casal, cada uma é uma foto diferente).
// Totalmente opcional: sem foto, o layout centralizado não é um "menos" da
// versão com foto, é um segundo tratamento pensado de propósito (mesmo
// princípio já aplicado ao Hero).
const storyImageUrl = computed(() => {
  const theme = (wedding.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.storyImageUrl ?? null
})

// Ponto de foco (enquadramento) escolhido pelo casal no upload — CLAUDE.md,
// seção 22.2. Default 50/50 = centro.
const storyFocalPosition = computed(() => {
  const theme = (wedding.theme_config ?? {}) as Partial<ThemeConfig>
  return `${theme.storyFocalX ?? 50}% ${theme.storyFocalY ?? 50}%`
})
</script>

<template>
  <PublicEditorialSection id="historia" eyebrow="Como tudo começou" title="Nossa História">
    <div v-if="storyImageUrl" class="grid gap-10 sm:grid-cols-2 sm:items-center">
      <NuxtImg
        :src="storyImageUrl"
        :alt="`Foto de ${wedding.couple_names}`"
        class="aspect-[4/5] w-full rounded-lg object-cover shadow-md"
        :style="{ objectPosition: storyFocalPosition }"
        sizes="sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw"
        loading="lazy"
      />
      <div class="flex flex-col gap-4 text-body">
        <p v-for="(paragraph, index) in STORY_CONTENT.paragraphs" :key="index" class="leading-relaxed">
          {{ paragraph }}
        </p>
      </div>
    </div>

    <div v-else class="mx-auto flex max-w-2xl flex-col gap-4 text-center text-body">
      <p v-for="(paragraph, index) in STORY_CONTENT.paragraphs" :key="index" class="leading-relaxed">
        {{ paragraph }}
      </p>
    </div>
  </PublicEditorialSection>
</template>
