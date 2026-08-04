<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { resolveHeroButtons } from '#shared/hero-buttons'
import type { EventSegment } from '~/types/event-segment'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  segments?: EventSegment[]
  /**
   * Token de acesso do convidado (?code=), se presente na URL atual —
   * resolvido pela página (que já tem contexto de rota real) em vez de
   * chamar useRoute() aqui dentro: mantém este componente testável com
   * @vue/test-utils puro, sem precisar de app Nuxt completo no mount.
   */
  code?: string
}

const { wedding, segments = [], code } = defineProps<Props>()

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

// Monograma d'água ao fundo (iniciais do casal, ex.: "M & R") — "sensação
// de convite" pedida pelo usuário, referência de estilo real. Só na
// variante sem foto de capa: sobre uma foto ficaria pouco legível/
// concorreria com a imagem.
const monogramInitials = computed(() => {
  if (!coupleNameParts.value) return null
  const [first, second] = coupleNameParts.value
  const a = first?.trim().charAt(0)
  const b = second?.trim().charAt(0)
  return a && b ? `${a} & ${b}` : null
})

// Local em destaque na linha da data — primeiro item do cronograma que tem
// nome de local cadastrado (normalmente a Cerimônia).
const primaryVenueName = computed(
  () => segments.find((segment) => segment.venue_name)?.venue_name ?? null,
)

// Contagem regressiva embutida no Hero (antes era uma seção própria mais
// abaixo na página) — mesma regra de exibição de sempre.
const showCountdown = computed(() => theme.value.showCountdown ?? true)
const targetDateTime = computed(() =>
  resolveEventDateTime(wedding.event_date, wedding.event_time).toISOString(),
)

// Totalmente opcional — casais sem foto de capa não têm um "menos" do
// layout com foto, têm um segundo layout pensado de propósito (tipografia
// maior, cor secundária como destaque de fundo), nunca um espaço vazio.
const coverImageUrl = computed(() => theme.value.coverImageUrl ?? null)

// Ponto de foco (enquadramento) escolhido pelo casal no upload — CLAUDE.md,
// seção 22.2. Default 50/50 = centro (mesmo comportamento de antes da
// ferramenta existir).
const coverFocalPosition = computed(
  () => `${theme.value.coverFocalX ?? 50}% ${theme.value.coverFocalY ?? 50}%`,
)

// Atalhos de navegação logo abaixo da contagem (gap vs. concorrente —
// CLAUDE.md, comparativo com mimodocasal.com.br). O casal escolhe quais
// aparecem e qual fica em destaque (theme_config.heroButtons/
// heroFeaturedButton, editável em /admin/configuracoes) — catálogo fixo em
// shared/hero-buttons.ts, sem seleção salva ainda cai num default sensato.
// shared/hero-buttons.ts guarda só a âncora ("/#historia" etc.) — precisa do
// slug do casamento (CLAUDE.md, seção 4.4/33) prefixado aqui para navegar
// para a home certa em vez de cair na raiz neutra sem casamento nenhum.
const heroButtons = computed(() =>
  resolveHeroButtons(theme.value.heroButtons, theme.value.heroFeaturedButton).map((button) => {
    // 'presentes' é o único atalho que navega pra uma página de verdade
    // (não uma âncora na home) — precisa preservar ?code=, senão o
    // convidado perde a autorização de reservar/contribuir ao clicar.
    const suffix = button.id === 'presentes' && code ? `?code=${code}` : ''
    return { ...button, href: `/${wedding.slug}${button.href}${suffix}` }
  }),
)
</script>

<template>
  <section
    v-if="coverImageUrl"
    class="relative flex min-h-[70vh] items-end justify-center overflow-hidden sm:min-h-[80vh]"
  >
    <!--
      ATENÇÃO: a prop `sizes` do NuxtImg NÃO aceita o valor cru do atributo
      HTML `sizes` (ex.: "100vw" ou "(min-width: 640px) 50vw, 100vw"). O
      @nuxt/image só entende o formato "breakpoint:valor" (chaves iguais às
      de tailwind.config: sm/md/lg/xl/2xl). Um valor sem ":" é tratado como
      chave "1px" — para tamanhos em vw isso gera um srcset de ~1px de
      largura, uma imagem essencialmente invisível, sem nenhum erro visível
      no console (achado real desta fase, CLAUDE.md seção 27.1). Sempre usar
      "sm:X md:X lg:X xl:X 2xl:X" (repetindo o valor quando for constante em
      todos os breakpoints) — nunca um valor solto com "vw".
    -->
    <NuxtImg
      :src="coverImageUrl"
      :alt="`Foto de capa de ${wedding.couple_names}`"
      class="absolute inset-0 h-full w-full object-cover"
      :style="{ objectPosition: coverFocalPosition }"
      sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
      preload
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative flex flex-col items-center gap-4 px-4 pb-16 pt-20 text-center text-white"
    >
      <p class="text-sm uppercase tracking-widest text-white/80">Vamos nos casar</p>
      <PublicHeroFlourish class="text-white/85" />
      <h1 v-if="coupleNameParts" class="font-display text-5xl font-semibold leading-tight sm:text-6xl">
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-5xl font-semibold sm:text-6xl">{{ wedding.couple_names }}</h1>
      <span class="h-px w-12 bg-white/70" aria-hidden="true" />
      <p class="text-lg text-white/90">
        {{ formattedDate }}<template v-if="primaryVenueName"> • {{ primaryVenueName }}</template>
      </p>

      <div v-if="showCountdown" class="mt-2 flex justify-center">
        <UiCountdownTimer :target-date-time="targetDateTime">
          <template #past>
            <p class="text-lg font-medium text-white">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </div>

      <div v-if="heroButtons.length" class="mt-2 flex flex-wrap items-center justify-center gap-3">
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

      <div class="mt-6 flex flex-col items-center gap-2 text-xs uppercase tracking-widest text-white/70">
        <span>Role para descobrir</span>
        <span class="flex h-8 w-8 items-center justify-center rounded-full border border-white/60">
          <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
        </span>
      </div>
    </div>

    <svg
      viewBox="0 0 1440 120"
      preserve-aspect-ratio="none"
      aria-hidden="true"
      class="absolute inset-x-0 bottom-0 h-16 w-full text-surface sm:h-24"
    >
      <path fill="currentColor" d="M0,120 L0,70 Q720,-10 1440,70 L1440,120 Z" />
    </svg>
  </section>

  <section v-else class="relative flex flex-col items-center gap-6 overflow-hidden bg-surface-muted px-4 py-24 text-center sm:py-32">
    <!-- Luz diagonal suave, mesma sensação de convite impresso da referência. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_45%)]"
    />

    <PublicHeroCornerBranch class="pointer-events-none absolute left-4 top-4 text-secondary/50 sm:left-8 sm:top-8" />
    <PublicHeroCornerBranch
      class="pointer-events-none absolute right-4 top-4 -scale-x-100 text-secondary/50 sm:right-8 sm:top-8"
    />

    <p
      v-if="monogramInitials"
      aria-hidden="true"
      class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 select-none font-display text-[12rem] font-semibold leading-none text-secondary/[0.09] sm:text-[18rem]"
    >
      {{ monogramInitials }}
    </p>

    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="relative flex flex-col items-center gap-4"
    >
      <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
      <PublicHeroFlourish class="text-secondary" />
      <h1
        v-if="coupleNameParts"
        class="font-display text-6xl font-semibold leading-tight text-heading sm:text-7xl"
      >
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-6xl font-semibold text-heading sm:text-7xl">
        {{ wedding.couple_names }}
      </h1>
      <span class="h-px w-12 bg-secondary" aria-hidden="true" />
      <p class="text-lg text-text-muted">
        {{ formattedDate }}<template v-if="primaryVenueName"> • {{ primaryVenueName }}</template>
      </p>

      <div v-if="showCountdown" class="mt-2 flex justify-center">
        <UiCountdownTimer :target-date-time="targetDateTime" variant="inline">
          <template #past>
            <p class="text-lg font-medium text-primary">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </div>

      <div v-if="heroButtons.length" class="mt-2 flex flex-wrap items-center justify-center gap-3">
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

      <div class="mt-6 flex flex-col items-center gap-2 text-xs uppercase tracking-widest text-text-muted">
        <span>Role para descobrir</span>
        <span class="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/50 text-secondary">
          <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
        </span>
      </div>
    </div>

    <svg
      viewBox="0 0 1440 120"
      preserve-aspect-ratio="none"
      aria-hidden="true"
      class="absolute inset-x-0 bottom-0 h-16 w-full text-surface sm:h-24"
    >
      <path fill="currentColor" d="M0,120 L0,70 Q720,-10 1440,70 L1440,120 Z" />
    </svg>
  </section>
</template>
