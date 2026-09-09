<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { resolveHeroButtons } from '#shared/hero-buttons'
import { dividirNomesCasal, iniciaisCasal } from '#shared/utils/nomes-casal'
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

const theme = computed(() => (wedding.config_tema ?? {}) as Partial<ThemeConfig>)

const formattedDate = computed(() =>
  new Date(`${wedding.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

// "Nome1 & Nome2" (convenção usada em todo o projeto) vira 3 linhas
// ("Nome1" / "&" / "Nome2") para o tratamento tipográfico grande do Hero —
// nomes fora desse padrão caem no fallback de uma linha só, sem quebrar.
const coupleNameParts = computed(() => dividirNomesCasal(wedding.nomes_noivos))

// Monograma d'água ao fundo (iniciais do casal em cascata diagonal, ex.:
// M / & / R) — "sensação de convite" pedida pelo usuário, opacidade de
// textura (2–4%, brief da Rodada 6).
const monogramInitials = computed(() => iniciaisCasal(wedding.nomes_noivos))

// Arte própria do monograma (Fase Rebrand do Convite). Quando existe, ela
// substitui a cascata de iniciais como marca d'água — na mesma opacidade de
// textura, para continuar sendo fundo e não ilustração.
const monogramImageUrl = computed(() => theme.value.monogramImageUrl ?? null)

// Caixa alta come largura: "MATEUS AUGUSTO" ocupa bem mais que "Mateus
// Augusto" no mesmo corpo, e no celular o nome estouraria a régua. Por isso o
// estilo 'engraved' desce um degrau na escala de tamanho — a compensação vive
// aqui, junto das classes de tamanho, e não no CSS global que aplica a caixa
// alta (main.css), que não tem como saber o corpo de cada título.
const headingStyle = computed(() => theme.value.headingStyle ?? 'classic')
const coupleNameSizeClasses = computed(() =>
  headingStyle.value === 'engraved' ? 'text-3xl sm:text-6xl' : 'text-4xl sm:text-7xl',
)

// Textura de papel de algodão (ruído SVG inline, sem request externo) —
// aplicada em opacidade mínima sobre o fundo marfim para o Hero não ser um
// bloco de cor chapado (brief da Rodada 6: "papel premium para convites").
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`

// Local em destaque na linha da data — primeiro item do cronograma que tem
// nome de local cadastrado (normalmente a Cerimônia).
const primaryVenueName = computed(
  () => segments.find((segment) => segment.nome_local)?.nome_local ?? null,
)

// Contagem regressiva embutida no Hero (antes era uma seção própria mais
// abaixo na página) — mesma regra de exibição de sempre.
const showCountdown = computed(() => theme.value.showCountdown ?? true)
const targetDateTime = computed(() =>
  resolveEventDateTime(wedding.data_evento, wedding.horario_evento).toISOString(),
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
// aparecem e qual fica em destaque (config_tema.heroButtons/
// heroFeaturedButton, editável em /admin/configuracoes) — catálogo fixo em
// shared/hero-buttons.ts, sem seleção salva ainda cai num default sensato.
// shared/hero-buttons.ts guarda só a âncora ("/#historia" etc.) — precisa do
// slug do casamento (CLAUDE.md, seção 4.4/33) prefixado aqui para navegar
// para a home certa em vez de cair na raiz neutra sem casamento nenhum.
const heroButtons = computed(() =>
  // `hiddenSections` entra aqui porque um atalho para uma seção desligada é um
  // link para lugar nenhum: o convidado clica e a página não se move.
  resolveHeroButtons(
    theme.value.heroButtons,
    theme.value.heroFeaturedButton,
    theme.value.hiddenSections,
  ).map((button) => {
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
    class="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden bg-surface-muted px-6 pt-10 pb-20 text-center sm:pt-12 sm:pb-24"
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
    <!--
      Decorativa, não ilustrativa: a foto entra a 20% de opacidade com blur,
      como fundo-ambiente sob o texto. Descrevê-la anunciaria a um leitor de
      tela uma imagem que ninguém consegue ver — `alt=""` é a marcação correta.
    -->
    <NuxtImg
      v-if="coverImageUrl"
      :src="coverImageUrl"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-[2px]"
      :style="{ objectPosition: coverFocalPosition }"
      sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
      preload
    />

    <!-- Profundidade do fundo (brief Rodada 6): textura de papel + luz suave, nunca cor chapada. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
      :style="{ backgroundImage: PAPER_TEXTURE }"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_45%)]"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_0%,rgba(255,255,255,0.45),transparent_60%)]"
    />

    <!-- Arte própria do casal como marca d'água — mesma opacidade de textura
         da cascata de iniciais que ela substitui: continua sendo fundo. -->
    <img
      v-if="monogramImageUrl"
      :src="monogramImageUrl"
      alt=""
      data-test="hero-monogram-image"
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 right-0 my-auto h-[70%] w-auto translate-x-[12%] select-none object-contain opacity-[0.06]"
    />

    <div
      v-else-if="monogramInitials"
      data-test="hero-monogram"
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 right-0 flex translate-x-[12%] select-none items-center font-display font-medium leading-none text-heading/[0.04]"
    >
      <span class="text-[13rem] sm:text-[22rem]">{{ monogramInitials.primeiro }}</span>
      <span class="translate-y-[4.5rem] text-[10rem] italic sm:translate-y-[8rem] sm:text-[17rem]"
        >&amp;</span
      >
      <span class="translate-y-[9rem] text-[13rem] sm:translate-y-[16rem] sm:text-[22rem]">{{
        monogramInitials.segundo
      }}</span>
    </div>

    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
      class="relative flex w-full max-w-full min-w-0 flex-col items-center gap-5"
    >
      <!-- Filetes, ramo e o "&" são ornamento, não acento de interface: desde
           a Fase Rebrand do Convite saem de --color-ornament, que por default
           ainda é a secundária (main.css) — quem não escolheu um dourado
           continua vendo exatamente o Hero de antes. -->
      <p
        class="flex items-center gap-2 text-xs tracking-[0.2em] text-text-muted uppercase sm:gap-3 sm:text-sm sm:tracking-[0.35em]"
      >
        <span class="h-px w-6 bg-ornament/60" aria-hidden="true" />
        Vamos nos casar
        <span class="h-px w-6 bg-ornament/60" aria-hidden="true" />
      </p>
      <PublicHeroFlourish class="text-ornament" />
      <h1
        v-if="coupleNameParts"
        class="font-display font-semibold leading-[1.05] text-heading"
        :class="coupleNameSizeClasses"
      >
        <span class="block">{{ coupleNameParts.primeiro }}</span>
        <span class="block py-1 text-[0.45em] font-normal italic leading-none text-ornament"
          >&amp;</span
        >
        <span class="block">{{ coupleNameParts.segundo }}</span>
      </h1>
      <h1 v-else class="font-display font-semibold text-heading" :class="coupleNameSizeClasses">
        {{ wedding.nomes_noivos }}
      </h1>
      <span class="h-px w-14 bg-ornament/80" aria-hidden="true" />
      <p class="text-xs tracking-[0.2em] text-text-muted uppercase sm:text-sm sm:tracking-[0.3em]">
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
          size="lg"
        >
          <Icon :name="button.icon" class="h-4 w-4" />
          {{ button.label }}
        </UiButton>
      </div>

      <!-- Instrução de gesto visual: quem usa leitor de tela não "rola para
           descobrir", navega por landmark e cabeçalho. -->
      <div
        aria-hidden="true"
        class="mt-8 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-text-muted"
      >
        <span>Role para descobrir</span>
        <span class="h-5 w-px bg-ornament/50" aria-hidden="true" />
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full border border-ornament/50 text-ornament"
        >
          <Icon name="lucide:arrow-down" class="h-3.5 w-3.5 animate-bounce" />
        </span>
      </div>
    </div>

    <!-- Mesma curva das costuras de seção (EditorialSection) — uma única linguagem de transição no site inteiro. -->
    <svg
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      aria-hidden="true"
      class="absolute inset-x-0 bottom-0 h-10 w-full text-surface sm:h-14"
    >
      <path fill="currentColor" d="M0,96 L0,64 Q720,0 1440,64 L1440,96 Z" />
    </svg>
  </section>
</template>
