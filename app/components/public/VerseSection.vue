<script setup lang="ts">
// Versículo — a página cheia na cor primária com texto em dourado que, no
// convite impresso, separa duas páginas claras (Fase Rebrand do Convite).
//
// Não usa PublicEditorialSection de propósito, e a razão é a mesma que faz a
// seção existir: aqui não há eyebrow, título nem divisor. É uma pausa na
// leitura, não um capítulo — o tratamento de "capítulo" a transformaria em
// mais uma seção com cabeçalho, que é exatamente o oposto do efeito.
//
// É a ÚNICA seção em que --color-ornament vira texto de verdade. Funciona
// porque o fundo aqui é a primária escura, não o marfim da página — o par é
// validado por checkOrnamentOnPrimary() e o casal é avisado na tela de
// Aparência quando a combinação dele não passa em AA.
import { hasVerseContent, resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const verse = computed(() => resolveWeddingContent(wedding.config_conteudo).verse)
// Sem texto, a seção não existe — é assim que o casal a remove, e é por isso
// que ela não tem texto padrão de plataforma (ver weddingContentConfigSchema).
const hasContent = computed(() => hasVerseContent(verse.value))
</script>

<template>
  <section v-if="hasContent" id="versiculo" class="bg-primary px-6 py-16 text-center">
    <blockquote
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto max-w-3xl"
    >
      <p
        class="font-display text-lg uppercase leading-relaxed tracking-[0.12em] text-ornament sm:text-xl"
      >
        “{{ verse.text }}”
      </p>
      <footer
        v-if="verse.reference"
        class="mt-6 text-xs uppercase tracking-[0.35em] text-ornament/80"
      >
        {{ verse.reference }}
      </footer>
    </blockquote>
  </section>
</template>
