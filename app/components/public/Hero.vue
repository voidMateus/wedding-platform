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

// Monograma d'água ao fundo (iniciais do casal em cascata diagonal, ex.:
// M / & / R) — "sensação de convite" pedida pelo usuário, opacidade de
// textura (2–4%, brief da Rodada 6).
const monogramInitials = computed(() => {
  if (!coupleNameParts.value) return null
  const [first, second] = coupleNameParts.value
  const a = first?.trim().charAt(0)
  const b = second?.trim().charAt(0)
  return a && b ? { a, b } : null
})

// Textura de papel de algodão (ruído SVG inline, sem request externo) —
// aplicada em opacidade mínima sobre o fundo marfim para o Hero não ser um
// bloco de cor chapado (brief da Rodada 6: "papel premium para convites").
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`

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

// Foto de capa opcional — desde a Rodada 8 não existe mais um segundo
// layout "com foto": o Hero é um só (o convite em marfim), e a foto entra
// como fundo-ambiente sob um véu (opacidade baixa + leve blur). Motivo
// real: no layout antigo o texto ficava branco flutuando sobre a foto crua
// — com uma foto clara, sumia por completo (feedback do usuário).
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
    class="relative flex min-h-[88vh] flex-col items-center justify-center gap-6 overflow-hidden bg-surface-muted px-4 pb-28 pt-20 text-center sm:pb-36 sm:pt-24"
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
      v-if="coverImageUrl"
      :src="coverImageUrl"
      :alt="`Foto de capa de ${wedding.couple_names}`"
      class="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-[2px]"
      :style="{ objectPosition: coverFocalPosition }"
      sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
      preload
    />

    <!-- Profundidade do fundo (brief Rodada 6): textura de papel + luz suave, nunca cor chapada. -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply" :style="{ backgroundImage: PAPER_TEXTURE }" />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_45%)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_0%,rgba(255,255,255,0.45),transparent_60%)]"
    />

    <div
      v-if="monogramInitials"
      data-test="hero-monogram"
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 right-0 flex translate-x-[12%] select-none items-center font-display font-medium leading-none text-heading/[0.04]"
    >
      <span class="text-[13rem] sm:text-[22rem]">{{ monogramInitials.a }}</span>
      <span class="translate-y-[4.5rem] text-[10rem] italic sm:translate-y-[8rem] sm:text-[17rem]">&amp;</span>
      <span class="translate-y-[9rem] text-[13rem] sm:translate-y-[16rem] sm:text-[22rem]">{{ monogramInitials.b }}</span>
    </div>

    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
      class="relative flex flex-col items-center gap-5"
    >
      <p class="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-text-muted sm:text-sm">
        <span class="h-px w-6 bg-secondary/60" aria-hidden="true" />
        Vamos nos casar
        <span class="h-px w-6 bg-secondary/60" aria-hidden="true" />
      </p>
      <PublicHeroFlourish class="text-secondary" />
      <h1
        v-if="coupleNameParts"
        class="font-display text-6xl font-semibold leading-[1.05] text-heading sm:text-8xl"
      >
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block py-1 text-[0.45em] font-normal italic leading-none text-secondary">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-6xl font-semibold text-heading sm:text-8xl">
        {{ wedding.couple_names }}
      </h1>
      <span class="h-px w-14 bg-secondary/80" aria-hidden="true" />
      <p class="text-xs uppercase tracking-[0.3em] text-text-muted sm:text-sm">
        {{ formattedDate }}<template v-if="primaryVenueName"> • {{ primaryVenueName }}</template>
      </p>

      <div v-if="showCountdown" class="mt-3 flex justify-center">
        <UiCountdownTimer :target-date-time="targetDateTime" variant="inline">
          <template #past>
            <p class="text-lg font-medium text-primary">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </div>

      <div v-if="heroButtons.length" class="mt-4 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-for="button in heroButtons"
          :key="button.id"
          :to="button.href"
          :variant="button.featured ? 'primary' : 'outline'"
          rounded="full"
          class="!h-11 !px-6 !text-xs uppercase tracking-[0.18em]"
        >
          <Icon :name="button.icon" class="h-4 w-4" />
          {{ button.label }}
        </UiButton>
      </div>

      <div class="mt-8 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-text-muted">
        <span>Role para descobrir</span>
        <span class="h-5 w-px bg-secondary/50" aria-hidden="true" />
        <span class="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/50 text-secondary">
          <Icon name="lucide:arrow-down" class="h-3.5 w-3.5 animate-bounce" />
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
