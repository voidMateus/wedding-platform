<script setup lang="ts">
// Hero cinematográfico (CLAUDE.md, Fase Premium Experience/PR4) —
// reconstrução completa: primeiro lugar onde a Assinatura Visual (selo do
// casal, tipografia editorial, espaçamento) aparece por inteiro. Duas
// variantes (com/sem foto de capa) continuam existindo — a segunda nunca é
// "a versão sem recurso", é uma composição própria, pensada para não deixar
// espaço vazio.
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { resolveHeroButtons } from '#shared/hero-buttons'
import type { EventSegment } from '~/types/event-segment'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  segments?: EventSegment[]
}

const { wedding, segments = [] } = defineProps<Props>()

const theme = computed(() => (wedding.theme_config ?? {}) as Partial<ThemeConfig>)

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

// "Nome1 & Nome2" (convenção usada em todo o projeto) vira 3 linhas
// ("Nome1" / "&" / "Nome2") para o tratamento tipográfico grande do Hero —
// nomes fora desse padrão caem no fallback de uma linha só, sem quebrar.
const coupleNameParts = computed(() => {
  const parts = wedding.couple_names.split(/\s*&\s*/)
  return parts.length === 2 ? parts : null
})

// Local em destaque na faixa de "quando & onde" — primeiro item do
// cronograma que tem nome de local cadastrado (normalmente a Cerimônia).
const primaryVenueName = computed(
  () => segments.find((segment) => segment.venue_name)?.venue_name ?? null,
)

// Contagem regressiva embutida no Hero (antes era uma seção própria mais
// abaixo na página) — mesma regra de exibição de sempre.
const showCountdown = computed(() => theme.value.showCountdown ?? true)
const targetDateTime = computed(() =>
  resolveEventDateTime(wedding.event_date, wedding.event_time).toISOString(),
)
// Estilo configurável pelo casal (/admin/configuracoes, CLAUDE.md — Fase
// Premium Experience/PR2); 'inline' precisa saber se está sobre foto de capa
// para inverter a cor do texto (ver CountdownTimer.vue, prop `inverted`).
const countdownStyle = computed(() => theme.value.countdownStyle ?? 'cards')

// Totalmente opcional — casais sem foto de capa não têm um "menos" do
// layout com foto, têm um segundo layout pensado de propósito (tipografia
// maior, textura sutil de fundo), nunca um espaço vazio.
const coverImageUrl = computed(() => theme.value.coverImageUrl ?? null)

// Ponto de foco (enquadramento) escolhido pelo casal no upload — CLAUDE.md,
// seção 22.2. Default 50/50 = centro (mesmo comportamento de antes da
// ferramenta existir).
const coverFocalPosition = computed(
  () => `${theme.value.coverFocalX ?? 50}% ${theme.value.coverFocalY ?? 50}%`,
)

// Atalhos de navegação logo abaixo da faixa de "quando & onde" (gap vs.
// concorrente — CLAUDE.md, comparativo com mimodocasal.com.br). O casal
// escolhe quais aparecem e qual fica em destaque
// (theme_config.heroButtons/heroFeaturedButton, editável em
// /admin/configuracoes) — catálogo fixo em shared/hero-buttons.ts, sem
// seleção salva ainda cai num default sensato. shared/hero-buttons.ts
// guarda só a âncora ("/#presentes") — precisa do slug do casamento
// (CLAUDE.md, seção 4.4/33) prefixado aqui para navegar para a home certa
// em vez de cair na raiz neutra sem casamento nenhum.
const heroButtons = computed(() =>
  resolveHeroButtons(theme.value.heroButtons, theme.value.heroFeaturedButton).map((button) => ({
    ...button,
    href: `/${wedding.slug}${button.href}`,
  })),
)
</script>

<template>
  <section
    v-if="coverImageUrl"
    class="relative flex min-h-[75vh] items-end justify-center overflow-hidden sm:min-h-[85vh]"
  >
    <div class="absolute inset-0 h-full w-full">
      <!--
        ATENÇÃO: a prop `sizes` do NuxtImg (repassada por UiTreatedImage) NÃO
        aceita o valor cru do atributo HTML `sizes` (ex.: "100vw"). Ver
        comentário original em UiTreatedImage.vue / CLAUDE.md seção 27.2 —
        sempre "sm:X md:X lg:X xl:X 2xl:X", nunca um valor solto com "vw".
      -->
      <UiTreatedImage
        :src="coverImageUrl"
        :alt="`Foto de capa de ${wedding.couple_names}`"
        full-bleed
        overlay="full"
        :object-position="coverFocalPosition"
        sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
        priority
        class="h-full w-full"
      />
    </div>
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative flex w-full flex-col items-center gap-4 px-4 pb-14 pt-20 text-center text-white"
    >
      <PublicCoupleMonogram :couple-names="wedding.couple_names" inverted />
      <p class="text-sm uppercase tracking-widest text-white/80">Vamos nos casar</p>
      <h1 v-if="coupleNameParts" class="font-display text-5xl font-semibold leading-none sm:text-6xl">
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-5xl font-semibold sm:text-6xl">{{ wedding.couple_names }}</h1>

      <div
        class="mt-1 flex w-full max-w-md flex-col gap-3 rounded-lg border border-white/25 px-5 py-4 sm:flex-row sm:items-center sm:gap-0"
      >
        <div class="flex flex-1 flex-col gap-0.5 text-left">
          <span class="text-[11px] uppercase tracking-widest text-white/60">Quando &amp; onde</span>
          <span class="text-sm font-medium text-white">
            {{ formattedDate }}<template v-if="primaryVenueName"> · {{ primaryVenueName }}</template>
          </span>
        </div>

        <template v-if="showCountdown">
          <span aria-hidden="true" class="hidden h-10 w-px bg-white/25 sm:mx-5 sm:block" />
          <span aria-hidden="true" class="h-px w-full bg-white/25 sm:hidden" />
          <div class="sm:flex-1">
            <UiCountdownTimer :target-date-time="targetDateTime" :variant="countdownStyle" inverted>
              <template #past>
                <p class="text-sm font-medium text-white">O grande dia chegou!</p>
              </template>
            </UiCountdownTimer>
          </div>
        </template>
      </div>

      <div v-if="heroButtons.length" class="mt-1 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-for="button in heroButtons"
          :key="button.id"
          :to="button.href"
          :variant="button.featured ? 'primary' : 'outline'"
          rounded="full"
          size="sm"
          :class="!button.featured ? '!border-white !text-white hover:!bg-white/10' : ''"
        >
          <Icon :name="button.icon" class="h-4 w-4" />
          {{ button.label }}
        </UiButton>
      </div>

      <div class="mt-4 flex flex-col items-center gap-1 text-xs uppercase tracking-widest text-white/70">
        <span>Role</span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
      </div>
    </div>
  </section>

  <section v-else class="relative overflow-hidden px-4 py-24 text-center sm:py-32">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-secondary/[0.06] via-transparent to-transparent"
    />
    <UiTexture class="text-secondary" />
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative flex flex-col items-center gap-4"
    >
      <PublicCoupleMonogram :couple-names="wedding.couple_names" size="lg" />
      <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
      <h1
        v-if="coupleNameParts"
        class="font-display text-6xl font-semibold leading-none text-heading sm:text-7xl"
      >
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-6xl font-semibold text-heading sm:text-7xl">
        {{ wedding.couple_names }}
      </h1>

      <div
        class="mt-1 flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-surface-elevated px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-0"
      >
        <div class="flex flex-1 flex-col gap-0.5 text-left">
          <span class="text-[11px] uppercase tracking-widest text-text-muted">Quando &amp; onde</span>
          <span class="text-sm font-medium text-text">
            {{ formattedDate }}<template v-if="primaryVenueName"> · {{ primaryVenueName }}</template>
          </span>
        </div>

        <template v-if="showCountdown">
          <span aria-hidden="true" class="hidden h-10 w-px bg-border sm:mx-5 sm:block" />
          <span aria-hidden="true" class="h-px w-full bg-border sm:hidden" />
          <div class="sm:flex-1">
            <UiCountdownTimer :target-date-time="targetDateTime" :variant="countdownStyle">
              <template #past>
                <p class="text-sm font-medium text-primary">O grande dia chegou!</p>
              </template>
            </UiCountdownTimer>
          </div>
        </template>
      </div>

      <div v-if="heroButtons.length" class="mt-1 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-for="button in heroButtons"
          :key="button.id"
          :to="button.href"
          :variant="button.featured ? 'primary' : 'outline'"
          rounded="full"
          size="sm"
        >
          <Icon :name="button.icon" class="h-4 w-4" />
          {{ button.label }}
        </UiButton>
      </div>

      <div class="mt-4 flex flex-col items-center gap-1 text-xs uppercase tracking-widest text-text-muted">
        <span>Role</span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
      </div>
    </div>
  </section>
</template>
