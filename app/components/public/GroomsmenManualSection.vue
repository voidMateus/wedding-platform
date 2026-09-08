<script setup lang="ts">
// Manual dos Padrinhos (Fase Rebrand do Convite) — seção própria, separada do
// Manual dos Convidados. Público diferente, informação diferente: aqui é o
// traje combinado e a paleta que padrinhos e madrinhas precisam comprar; lá é
// estacionamento, horário e hospedagem.
//
// Cada bloco aparece só se tiver conteúdo, e a seção inteira some quando não
// há nada — a maioria dos casamentos não tem manual de padrinhos, e essa é a
// forma de "desligar" a seção (mesmo contrato de Manual e FAQ).
import { hasGroomsmenManualContent, resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  /** Fundo da seção — resolvido pela página (resolveHomeSections), nunca fixo aqui. */
  tone?: 'default' | 'muted'
}

const { wedding, tone = 'default' } = defineProps<Props>()

const manual = computed(() => resolveWeddingContent(wedding.config_conteudo).groomsmenManual)
const hasContent = computed(() => hasGroomsmenManualContent(manual.value))

// Os dois cartões de traje dividem a linha quando existem os dois, e ocupam a
// largura toda quando só um foi preenchido — um cartão sozinho ao lado de um
// buraco pareceria conteúdo faltando, não uma escolha.
const attireCards = computed(() =>
  [
    { id: 'eles', title: 'Para eles', icon: 'lucide:shirt', text: manual.value.attireGroomsmen },
    {
      id: 'elas',
      title: 'Para elas',
      icon: 'lucide:flower-2',
      text: manual.value.attireBridesmaids,
    },
  ].filter((card) => card.text.trim().length > 0),
)
</script>

<template>
  <PublicEditorialSection
    v-if="hasContent"
    id="manual-padrinhos"
    eyebrow="Para quem sobe ao altar com a gente"
    title="Manual dos Padrinhos"
    :tone="tone"
  >
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <p v-if="manual.intro" class="text-center leading-relaxed text-body">{{ manual.intro }}</p>

      <PublicDressCodeIllustration v-if="attireCards.length" class="mx-auto" />

      <div
        v-if="attireCards.length"
        class="grid gap-6"
        :class="attireCards.length > 1 ? 'sm:grid-cols-2' : ''"
      >
        <article
          v-for="card in attireCards"
          :key="card.id"
          class="flex flex-col items-start gap-3 rounded-xl border border-ornament/30 bg-surface-elevated p-6 shadow-sm"
        >
          <span
            class="flex h-11 w-11 items-center justify-center rounded-full bg-ornament/15 text-ornament"
          >
            <Icon :name="card.icon" class="h-5 w-5" />
          </span>
          <h3 class="font-display text-2xl text-heading">{{ card.title }}</h3>
          <p class="leading-relaxed text-body">{{ card.text }}</p>
        </article>
      </div>

      <div v-if="manual.palette.length" class="flex flex-col items-center gap-5">
        <p class="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
          Paleta de cores
        </p>
        <PublicColorSwatches :swatches="manual.palette" />
      </div>
    </div>
  </PublicEditorialSection>
</template>
