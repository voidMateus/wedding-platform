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
  <PublicEditorialSection id="dress-code" eyebrow="Como se vestir" title="Dress Code" :tone="tone">
    <div class="mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
      <PublicDressCodeIllustration />
      <p class="leading-relaxed text-body">{{ content.dressCodeDescription }}</p>

      <!--
        Chips, não lista com marcadores: cada sugestão de traje é um item
        independente e curto ("evite branco", "sapato confortável"), e em
        cápsulas lado a lado elas se leem de relance, que é como alguém
        confere o traje. A lista vertical dava a elas peso de regulamento.
        Vira coluna única no celular, onde duas cápsulas por linha
        espremeriam o texto.
      -->
      <ul v-if="content.dressCodeSuggestions.length" class="flex flex-wrap justify-center gap-3">
        <li
          v-for="tip in content.dressCodeSuggestions"
          :key="tip"
          class="inline-flex items-center gap-2 rounded-full border border-ornament/50 px-4 py-2 text-left text-xs tracking-[0.06em] text-heading"
        >
          <Icon name="lucide:shirt" class="h-3.5 w-3.5 shrink-0 text-ornament" aria-hidden="true" />
          {{ tip }}
        </li>
      </ul>
    </div>
  </PublicEditorialSection>
</template>
