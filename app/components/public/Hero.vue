<script setup lang="ts">
// Hero cinematográfico (CLAUDE.md, Fase Premium Experience/PR4) —
// reconstrução completa a partir de uma referência visual trazida pelo
// usuário (imagem de exemplo, sem site real associado): split assimétrico
// foto/conteúdo no desktop (foto empilhada acima do conteúdo no mobile,
// nunca sobreposta a texto — evita todo o problema de contraste
// texto-sobre-foto arbitrária), selo do casal, citação opcional, cartão de
// contagem regressiva com rótulo "Faltam", e a data/local numa linha
// própria, mais discreta.
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

// Local em destaque na linha de data/local — primeiro item do cronograma
// que tem nome de local cadastrado (normalmente a Cerimônia).
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
// Premium Experience/PR2) — sempre sobre o cartão "Faltam" (bg-surface-
// elevated), nunca sobre a foto no layout em split, então nunca precisa de
// `inverted` aqui.
const countdownStyle = computed(() => theme.value.countdownStyle ?? 'cards')

// Citação opcional (ex.: um versículo) — Fase Premium Experience/PR4.
// Atribuição só aparece se a citação também estiver definida.
const heroQuote = computed(() => theme.value.heroQuote ?? null)
const heroQuoteAttribution = computed(() => theme.value.heroQuoteAttribution ?? null)

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

// Atalhos de navegação (gap vs. concorrente — CLAUDE.md, comparativo com
// mimodocasal.com.br). O casal escolhe quais aparecem e qual fica em
// destaque (theme_config.heroButtons/heroFeaturedButton, editável em
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
  <section class="relative overflow-hidden bg-surface">
    <div
      class="relative flex flex-col"
      :class="coverImageUrl ? 'lg:grid lg:grid-cols-[55%_45%] lg:items-stretch' : ''"
    >
      <div v-if="coverImageUrl" class="relative h-[42vh] w-full lg:order-2 lg:h-auto lg:min-h-[85vh]">
        <UiTreatedImage
          :src="coverImageUrl"
          :alt="`Foto de ${wedding.couple_names}`"
          full-bleed
          overlay="none"
          :object-position="coverFocalPosition"
          sizes="sm:100vw md:100vw lg:50vw xl:50vw 2xl:50vw"
          priority
          class="h-full w-full"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-surface to-transparent lg:block"
        />
      </div>

      <div
        class="relative flex flex-col items-center gap-4 overflow-hidden px-6 text-center"
        :class="coverImageUrl ? 'py-16 lg:order-1 lg:justify-center lg:px-12 lg:py-24' : 'py-24 sm:py-32'"
      >
        <UiTexture v-if="!coverImageUrl" class="text-secondary" />
        <UiBotanicalSprig
          aria-hidden="true"
          class="pointer-events-none absolute -left-10 -top-10 hidden h-56 w-56 text-secondary/50 lg:block"
        />

        <div
          v-motion
          :initial="{ opacity: 0, y: 24 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
          class="relative flex flex-col items-center gap-6"
        >
          <PublicCoupleMonogram :couple-names="wedding.couple_names" />
          <p class="text-sm uppercase tracking-widest text-secondary">Vamos nos casar!</p>
          <h1 v-if="coupleNameParts" class="font-display leading-none text-heading">
            <span class="block text-5xl font-semibold sm:text-6xl">{{ coupleNameParts[0] }}</span>
            <span class="block py-1 text-3xl font-normal text-secondary sm:text-4xl">&amp;</span>
            <span class="block text-5xl font-semibold sm:text-6xl">{{ coupleNameParts[1] }}</span>
          </h1>
          <h1 v-else class="font-display text-5xl font-semibold text-heading sm:text-6xl">
            {{ wedding.couple_names }}
          </h1>

          <div v-if="heroQuote" class="flex flex-col items-center gap-3">
            <UiSectionDivider />
            <blockquote class="max-w-xs text-sm italic leading-relaxed text-text-muted sm:max-w-sm">
              “{{ heroQuote }}”
              <footer v-if="heroQuoteAttribution" class="mt-1 text-xs not-italic tracking-wide text-text-muted">
                {{ heroQuoteAttribution }}
              </footer>
            </blockquote>
          </div>

          <div v-if="showCountdown" class="flex flex-col items-center gap-3">
            <p class="text-center text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Faltam
            </p>
            <!--
              O estilo 'cards' já desenha sua própria caixa por unidade — outra
              caixa por fora ficaria "caixa dentro de caixa" (achado de revisão
              visual contra a referência do usuário). Só 'inline' (números
              soltos) ganha o cartão elevado ao redor.
            -->
            <div
              :class="countdownStyle === 'inline' ? 'rounded-lg bg-surface-elevated px-8 py-6 shadow-lg' : ''"
            >
              <UiCountdownTimer :target-date-time="targetDateTime" :variant="countdownStyle">
                <template #past>
                  <p class="text-sm font-medium text-primary">O grande dia chegou!</p>
                </template>
              </UiCountdownTimer>
            </div>
          </div>

          <div v-if="heroButtons.length" class="flex flex-wrap items-center justify-center gap-3">
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

          <div class="flex flex-col items-center gap-1">
            <Icon name="lucide:calendar" class="h-4 w-4 text-secondary" />
            <span class="text-sm font-medium uppercase tracking-wide text-text">{{ formattedDate }}</span>
            <span v-if="primaryVenueName" class="text-xs uppercase tracking-widest text-text-muted">
              {{ primaryVenueName }}
            </span>
          </div>

          <Icon name="lucide:chevron-down" class="mt-1 h-5 w-5 animate-bounce text-text-muted" />
        </div>
      </div>
    </div>
  </section>
</template>
