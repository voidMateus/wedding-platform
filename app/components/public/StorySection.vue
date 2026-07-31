<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { STORY_CONTENT } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

// Reaproveita a mesma foto de capa do Hero (CLAUDE.md, seção 22.3) — a Fase
// Editorial não introduz um upload dedicado para esta seção. Totalmente
// opcional: sem foto, o layout centralizado não é um "menos" da versão com
// foto, é um segundo tratamento pensado de propósito (mesmo princípio já
// aplicado ao Hero).
const coverImageUrl = computed(() => {
  const theme = (wedding.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.coverImageUrl ?? null
})
</script>

<template>
  <PublicEditorialSection id="historia" title="Nossa História">
    <div v-if="coverImageUrl" class="grid gap-10 sm:grid-cols-2 sm:items-center">
      <NuxtImg
        :src="coverImageUrl"
        :alt="`Foto de ${wedding.couple_names}`"
        class="aspect-[4/5] w-full rounded-lg object-cover shadow-md"
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
