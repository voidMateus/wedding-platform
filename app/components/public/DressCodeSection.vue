<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { DRESS_CODE_CONTENT } from '#shared/wedding-content'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const theme = computed(() => (wedding.theme_config ?? {}) as Partial<ThemeConfig>)

// Só um indicativo visual da paleta do casal — não é um seletor interativo,
// nem uma nova validação de contraste (CLAUDE.md, seção 22.3 já cobre
// primaryColor/secondaryColor no momento em que são salvos).
const paletteSwatches = computed(() => [
  { color: theme.value.primaryColor ?? DEFAULT_PRIMARY_COLOR, label: 'Cor principal' },
  { color: theme.value.secondaryColor ?? DEFAULT_SECONDARY_COLOR, label: 'Cor complementar' },
])
</script>

<template>
  <PublicEditorialSection id="dress-code" eyebrow="Como se vestir" title="Dress Code">
    <div class="mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
      <PublicDressCodeIllustration />
      <p class="leading-relaxed text-body">{{ DRESS_CODE_CONTENT.description }}</p>

      <ul class="flex flex-col gap-2 self-start text-left text-body">
        <li
          v-for="tip in DRESS_CODE_CONTENT.suggestions"
          :key="tip"
          class="flex items-start gap-2"
        >
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
          <span>{{ tip }}</span>
        </li>
      </ul>

      <div class="flex items-center gap-6">
        <div v-for="swatch in paletteSwatches" :key="swatch.label" class="flex flex-col items-center gap-2">
          <span
            class="h-10 w-10 rounded-full border border-border shadow-sm"
            :style="{ backgroundColor: swatch.color }"
            aria-hidden="true"
          />
          <span class="text-xs text-text-muted">{{ swatch.label }}</span>
        </div>
      </div>
    </div>
  </PublicEditorialSection>
</template>
