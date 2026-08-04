<script setup lang="ts">
// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão usado nas demais seções públicas.
interface Props {
  title?: string
  /** Rótulo curto acima do título (ex.: "R.S.V.P", "Com carinho") — mesmo padrão de cabeçalho em toda seção pública (referência de estilo: mimodocasal.com.br). */
  eyebrow?: string
  tone?: 'default' | 'muted' | 'accent'
  divider?: boolean
  /** Costura curva no topo da seção (default true) — transição orgânica entre seções, nunca uma linha reta (Fase Linguagem Visual, Rodada 9). */
  seam?: boolean
  id?: string
}

const { title, eyebrow, tone = 'default', divider = true, seam = true, id } = defineProps<Props>()

// Tons sólidos (não translúcidos) de propósito: a costura curva do topo é
// preenchida com a MESMA cor do fundo da seção — um tom translúcido
// (bg-secondary/10 sobre fundos diferentes) produziria cores levemente
// divergentes entre a curva e o corpo da seção.
const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted',
  // Banda de destaque (ex: RSVP) — secundária a 10% sobre o off-white,
  // resolvida como cor sólida via color-mix.
  accent: 'bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))]',
}

const SEAM_FILL_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-surface',
  muted: 'text-surface-muted',
  accent: 'text-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))]',
}
</script>

<template>
  <section :id="id" class="relative px-4 py-20 sm:py-28" :class="TONE_CLASSES[tone]">
    <!--
      Costura curva: uma "colina" preenchida com a cor desta seção, subindo
      sobre a seção anterior (bottom-full). Entre seções da mesma cor fica
      invisível; entre cores diferentes vira a transição suave pedida pelo
      usuário — mesma curva da onda do Hero, linguagem única no site todo.
    -->
    <svg
      v-if="seam"
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 bottom-full h-10 w-full sm:h-14"
      :class="SEAM_FILL_CLASSES[tone]"
    >
      <path fill="currentColor" d="M0,96 L0,64 Q720,0 1440,64 L1440,96 Z" />
    </svg>
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto flex max-w-5xl flex-col gap-10"
    >
      <div v-if="title" class="flex flex-col items-center gap-3 text-center">
        <p v-if="eyebrow" class="text-xs font-medium tracking-[0.3em] text-primary/60 uppercase">{{ eyebrow }}</p>
        <h2 class="font-display text-4xl font-semibold text-heading sm:text-5xl">{{ title }}</h2>
        <UiSectionDivider v-if="divider" />
      </div>
      <slot />
    </div>
  </section>
</template>
