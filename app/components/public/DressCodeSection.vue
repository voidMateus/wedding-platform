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

/**
 * Referência visual de traje enviada pelo casal (config_tema.dressCodeImageUrl).
 *
 * Substituiu uma ilustração desenhada pela plataforma: era a única arte do
 * site que não vinha do casal e destoava de uma página feita de tipografia e
 * filete — além de aparecer igual em todo casamento. Sem imagem, a seção fica
 * com o texto e os cartões, que é também o que o protótipo do convite faz: a
 * imagem é um extra, não um buraco a preencher.
 */
const dressCodeImageUrl = computed(() => {
  const theme = (wedding.config_tema ?? {}) as Partial<ThemeConfig>
  return theme.dressCodeImageUrl ?? null
})
</script>

<template>
  <PublicEditorialSection id="dress-code" eyebrow="Como se vestir" title="Dress Code" :tone="tone">
    <div class="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
      <NuxtImg
        v-if="dressCodeImageUrl"
        :src="dressCodeImageUrl"
        alt="Referência de traje para o casamento"
        class="aspect-[4/3] w-full max-w-md rounded-xl border border-border/70 object-cover"
        sizes="sm:100vw md:50vw lg:28rem xl:28rem 2xl:28rem"
        loading="lazy"
      />
      <p class="max-w-xl leading-relaxed text-body">{{ content.dressCodeDescription }}</p>

      <!--
        Cartões no mesmo molde dos marcos de "Nossa História" — borda fina,
        alinhado à esquerda, em grade. As cápsulas que havia aqui antes só
        funcionavam para rótulos de duas ou três palavras; com uma frase
        inteira dentro, cada uma virava uma barra de largura diferente da
        vizinha, e a fileira ficava desalinhada em vez de ritmada.

        Sem a linha de título que os marcos têm: uma sugestão de traje É a
        frase, não tem um nome curto acima dela. O ícone ocupa a posição do
        rótulo, no mesmo dourado.
      -->
      <ul
        v-if="content.dressCodeSuggestions.length"
        class="grid w-full gap-6 text-left"
        :class="content.dressCodeSuggestions.length > 1 ? 'md:grid-cols-3' : 'mx-auto max-w-xl'"
      >
        <li
          v-for="tip in content.dressCodeSuggestions"
          :key="tip"
          class="rounded-xl border border-border/70 bg-surface-elevated p-6"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-ornament/15 text-ornament"
          >
            <Icon name="lucide:shirt" class="h-5 w-5" aria-hidden="true" />
          </span>
          <p class="mt-3 text-sm leading-relaxed text-text-muted">{{ tip }}</p>
        </li>
      </ul>
    </div>
  </PublicEditorialSection>
</template>
