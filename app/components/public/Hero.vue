<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
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
// CLAUDE.md, comparativo com mimodocasal.com.br). Âncoras fixas já usadas
// pela navbar e pelas próprias seções da home.
const HERO_QUICK_LINKS = [
  { to: '/#presentes', label: 'Ver lista de presentes', icon: 'lucide:gift', variant: 'primary' as const },
  { to: '/#confirmar-presenca', label: 'Confirmar presença', icon: 'lucide:check', variant: 'outline' as const },
  { to: '/#cronograma', label: 'Cerimônia e festa', icon: 'lucide:calendar-clock', variant: 'outline' as const },
  { to: '/#manual-convidados', label: 'Manual do convidado', icon: 'lucide:info', variant: 'outline' as const },
]
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
      <h1 v-if="coupleNameParts" class="font-display text-4xl font-semibold leading-tight sm:text-5xl">
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-4xl font-semibold sm:text-5xl">{{ wedding.couple_names }}</h1>
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

      <div class="mt-2 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-for="link in HERO_QUICK_LINKS"
          :key="link.to"
          :to="link.to"
          :variant="link.variant"
          rounded="full"
          size="sm"
          :class="link.variant === 'outline' ? '!border-white !text-white hover:!bg-white/10' : ''"
        >
          <Icon :name="link.icon" class="h-4 w-4" />
          {{ link.label }}
        </UiButton>
      </div>

      <div class="mt-6 flex flex-col items-center gap-1 text-xs uppercase tracking-widest text-white/70">
        <span>Role</span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
      </div>
    </div>
  </section>

  <section v-else class="flex flex-col items-center gap-6 bg-surface px-4 py-24 text-center sm:py-32">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="flex flex-col items-center gap-4"
    >
      <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
      <h1
        v-if="coupleNameParts"
        class="font-display text-5xl font-semibold leading-tight text-heading sm:text-6xl"
      >
        <span class="block">{{ coupleNameParts[0] }}</span>
        <span class="block">&amp;</span>
        <span class="block">{{ coupleNameParts[1] }}</span>
      </h1>
      <h1 v-else class="font-display text-5xl font-semibold text-heading sm:text-6xl">
        {{ wedding.couple_names }}
      </h1>
      <p class="text-lg text-text-muted">
        {{ formattedDate }}<template v-if="primaryVenueName"> • {{ primaryVenueName }}</template>
      </p>

      <div v-if="showCountdown" class="mt-2 flex justify-center">
        <UiCountdownTimer :target-date-time="targetDateTime">
          <template #past>
            <p class="text-lg font-medium text-primary">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </div>

      <div class="mt-2 flex flex-wrap items-center justify-center gap-3">
        <UiButton
          v-for="link in HERO_QUICK_LINKS"
          :key="link.to"
          :to="link.to"
          :variant="link.variant"
          rounded="full"
          size="sm"
        >
          <Icon :name="link.icon" class="h-4 w-4" />
          {{ link.label }}
        </UiButton>
      </div>

      <div class="mt-6 flex flex-col items-center gap-1 text-xs uppercase tracking-widest text-text-muted">
        <span>Role</span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 animate-bounce" />
      </div>
    </div>
  </section>
</template>
