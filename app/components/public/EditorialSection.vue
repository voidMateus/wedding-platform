<script setup lang="ts">
import type { HomeSectionTone } from '#shared/home-sections'
import { PUBLIC_ORNAMENT_FRAME_KEY } from '~/utils/public-theme-context'

// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão usado nas demais seções públicas.
//
// Sem costura curva entre seções desde a rodada 3 da Fase Rebrand do Convite:
// no protótipo do convite a única onda do site é a que fecha o Hero, e a
// passagem de um capítulo para o outro é uma troca seca de fundo. A curva
// repetida a cada seção dava à página um movimento de landing page que briga
// com o registro de papel impresso — e, com a moldura de filete ligada, as
// duas se cortavam.
interface Props {
  title?: string
  /** Rótulo curto acima do título (ex.: "R.S.V.P", "Com carinho") — mesmo padrão de cabeçalho em toda seção pública (referência de estilo: mimodocasal.com.br). */
  eyebrow?: string
  /**
   * Fundo da seção. Vem de fora (resolveHomeSections, via a página), nunca
   * fixado no componente de domínio: com a ordem e a visibilidade nas mãos do
   * casal, qualquer par de seções pode acabar adjacente, e um tom fixo fazia
   * duas seções seguidas caírem no mesmo fundo assim que a página era
   * reordenada.
   */
  tone?: Exclude<HomeSectionTone, 'primary'>
  divider?: boolean
  id?: string
}

const { title, eyebrow, tone = 'default', divider = true, id } = defineProps<Props>()

// Moldura de filete duplo (config_tema.ornamentFrame, Fase Rebrand do
// Convite): quando o casal liga, TODA seção editorial recebe a borda do
// convite impresso. Injetado pelo layout público — o porquê está em
// PUBLIC_ORNAMENT_FRAME_KEY. Sem provider (um teste montando a seção
// sozinha), o default `false` desenha a seção de sempre.
const ornamentFrame = inject(PUBLIC_ORNAMENT_FRAME_KEY, false)
const hasOrnamentFrame = computed(() => toValue(ornamentFrame))

// Tons sólidos, não translúcidos: `bg-secondary/10` sobre fundos diferentes
// produziria cores levemente divergentes de uma seção para a outra, e a
// alternância depende de os dois tons serem exatamente os mesmos em toda a
// página.
const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted',
  // Banda de destaque (ex: RSVP) — secundária a 10% sobre o off-white,
  // resolvida como cor sólida via color-mix.
  accent: 'bg-[color-mix(in_srgb,var(--color-secondary)_10%,var(--color-surface))]',
}

// `aria-labelledby` aponta para o <h2> da seção, dando a ela um nome acessível
// — é o que faz um leitor de tela anunciar "Nossa História, região" em vez de
// "região" onze vezes seguidas. Sem título não há o que apontar, e aí a seção
// não vira landmark nomeada.
const headingId = useId()
</script>

<template>
  <section
    :id="id"
    class="relative px-6 py-16"
    :class="[TONE_CLASSES[tone], hasOrnamentFrame ? 'ornament-frame sm:px-12 sm:py-20' : '']"
    :aria-labelledby="title ? headingId : undefined"
  >
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :visible-once="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="mx-auto flex max-w-5xl flex-col gap-8"
    >
      <div v-if="title" class="flex flex-col items-center gap-3 text-center">
        <p v-if="eyebrow" class="text-[10px] tracking-[0.4em] text-text-muted uppercase">
          {{ eyebrow }}
        </p>
        <h2 :id="headingId" class="font-display text-3xl font-semibold text-heading sm:text-4xl">
          {{ title }}
        </h2>
        <UiSectionDivider v-if="divider" />
      </div>
      <slot />
    </div>
  </section>
</template>
