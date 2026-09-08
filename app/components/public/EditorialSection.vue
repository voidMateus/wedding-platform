<script setup lang="ts">
import type { HomeSectionTone } from '#shared/home-sections'
import { PUBLIC_ORNAMENT_FRAME_KEY } from '~/utils/public-theme-context'

// Wrapper padrão de "capítulo" da home editorial (Fase Editorial —
// CLAUDE.md, seção 22.2). Título/divisor sempre centralizados; o conteúdo
// do slot default fica livre para o próprio layout de cada seção (texto
// corrido, cards, grade de fotos...). Reveal-on-scroll consistente com o
// mesmo padrão usado nas demais seções públicas.
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

// A costura curva existe SÓ quando não há moldura. As duas são metáforas
// opostas — a curva diz "as seções escorrem uma na outra", a moldura diz "cada
// seção é uma página do convite" — e juntas a onda passava por cima da borda
// enquanto o retângulo cortava a onda no meio. Com moldura ligada, é a própria
// moldura que separa uma seção da outra.
const hasSeam = computed(() => !hasOrnamentFrame.value)

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

// `aria-labelledby` aponta para o <h2> da seção, dando a ela um nome acessível
// — é o que faz um leitor de tela anunciar "Nossa História, região" em vez de
// "região" onze vezes seguidas. Sem título não há o que apontar, e aí a seção
// não vira landmark nomeada.
const headingId = useId()
</script>

<template>
  <section
    :id="id"
    class="relative px-4 py-20 sm:py-28"
    :class="[TONE_CLASSES[tone], hasOrnamentFrame ? 'ornament-frame sm:px-12 sm:py-24' : '']"
    :aria-labelledby="title ? headingId : undefined"
  >
    <!--
      Costura curva: uma "colina" preenchida com a cor desta seção, subindo
      sobre a seção anterior (bottom-full). Entre seções da mesma cor fica
      invisível; entre cores diferentes vira a transição suave pedida pelo
      usuário — mesma curva da onda do Hero, linguagem única no site todo.
    -->
    <svg
      v-if="hasSeam"
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
        <p v-if="eyebrow" class="text-xs font-medium tracking-[0.3em] text-primary/60 uppercase">
          {{ eyebrow }}
        </p>
        <h2 :id="headingId" class="font-display text-4xl font-semibold text-heading sm:text-5xl">
          {{ title }}
        </h2>
        <UiSectionDivider v-if="divider" />
      </div>
      <slot />
    </div>
  </section>
</template>
