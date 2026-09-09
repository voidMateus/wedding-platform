<script setup lang="ts">
// "Seja muito bem-vindo!" — a antessala do site, entre a capa e o primeiro
// capítulo. Não usa PublicEditorialSection de propósito: ali o título vem com
// eyebrow e filete, o vocabulário de "capítulo", e esta seção é uma fala
// direta do casal, não um capítulo.
//
// O texto é a única passagem do site em SERIFADA ITÁLICA GRANDE
// (--font-serif, Cormorant), e é o que diferencia voz de informação: o resto
// da página informa, aqui o casal fala. Vem do protótipo do convite, onde o
// mesmo bloco tem esse tratamento.
import { dividirNomesCasal } from '#shared/utils/nomes-casal'
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  /** Fundo da seção — resolvido pela página (resolveHomeSections), nunca fixo aqui. */
  tone?: 'default' | 'muted'
}

const { wedding, tone = 'default' } = defineProps<Props>()

const content = computed(() => resolveWeddingContent(wedding.config_conteudo))

// Esta seção não passa por PublicEditorialSection, então resolve o próprio
// fundo — com as mesmas classes, para a alternância da página valer para ela.
const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted',
}

/**
 * "Com carinho, Ana e João" — a assinatura que fecha a fala.
 *
 * Só os primeiros nomes, e só quando `nomes_noivos` está no padrão
 * "Nome1 & Nome2": fora dele não há como separar os dois sem chutar, e uma
 * assinatura errada é pior que nenhuma.
 */
const signature = computed(() => {
  const nomes = dividirNomesCasal(wedding.nomes_noivos)
  if (!nomes) return null
  const primeiro = nomes.primeiro.split(/\s+/)[0]
  const segundo = nomes.segundo.split(/\s+/)[0]
  return primeiro && segundo ? `${primeiro} e ${segundo}` : null
})
</script>

<template>
  <section id="boas-vindas" class="px-6 py-16 text-center" :class="TONE_CLASSES[tone]">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto max-w-2xl"
    >
      <h2 class="font-display text-2xl text-heading sm:text-3xl">{{ content.welcomeTitle }}</h2>

      <div class="mt-6 space-y-4">
        <p
          v-for="(paragraph, index) in content.welcomeParagraphs"
          :key="index"
          class="font-serif text-lg italic leading-relaxed text-text-muted sm:text-xl"
        >
          {{ paragraph }}
        </p>
      </div>

      <p v-if="signature" class="mt-8 text-sm text-text-muted">Com carinho, {{ signature }}</p>
    </div>
  </section>
</template>
