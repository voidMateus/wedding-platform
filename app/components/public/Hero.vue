<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const theme = computed(() => (wedding.theme_config ?? {}) as Partial<ThemeConfig>)

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
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
      <h1 class="font-display text-4xl font-semibold sm:text-5xl">{{ wedding.couple_names }}</h1>
      <p class="text-lg text-white/90">{{ formattedDate }}</p>
    </div>
  </section>

  <section v-else class="flex flex-col items-center gap-6 bg-secondary/10 px-4 py-24 text-center sm:py-32">
    <div
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
      class="flex flex-col items-center gap-4"
    >
      <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
      <h1 class="font-display text-5xl font-semibold text-heading sm:text-6xl">
        {{ wedding.couple_names }}
      </h1>
      <p class="text-lg text-text-muted">{{ formattedDate }}</p>
    </div>
  </section>
</template>
