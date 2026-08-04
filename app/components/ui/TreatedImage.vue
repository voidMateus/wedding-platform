<script setup lang="ts">
// Wrapper padrão de imagem (CLAUDE.md, Fase Premium Experience — Design
// System): centraliza o tratamento visual (proporção de corte, overlay
// para texto sobreposto, ponto de foco, placeholder em blur, lazy loading)
// que hoje se repete manualmente em cada seção com foto (capa, história,
// galeria, presentes). ATENÇÃO ao usar `sizes`: NuxtImg não aceita o valor
// cru de `sizes` em vw — precisa do formato "breakpoint:valor" (achado
// documentado no CLAUDE.md, seção 27.2). Este wrapper só repassa o que
// receber, a responsabilidade do formato continua de quem usa.
interface Props {
  src: string
  alt: string
  /** Proporção de corte (CSS aspect-ratio, ex.: '1/1', '4/5', '16/9'). Sem valor = altura natural, sem crop forçado. */
  ratio?: string
  /** Gradiente escuro para legibilidade de texto sobreposto (ex.: Hero). */
  overlay?: 'none' | 'bottom' | 'full'
  /** Ponto de foco em '<x>% <y>%' (CLAUDE.md, seção 22.2 — Ferramenta de enquadramento). Default = centro, igual ao object-position padrão do navegador. */
  objectPosition?: string
  /** Sangra até a borda do container pai — sem raio de borda próprio. */
  fullBleed?: boolean
  sizes?: string
  /** Carregamento prioritário (LCP, ex.: foto de capa do Hero) — equivalente ao `preload` do NuxtImg. Sem isso, lazy loading padrão. */
  priority?: boolean
}

const {
  src,
  alt,
  ratio,
  overlay = 'none',
  objectPosition,
  fullBleed = false,
  sizes,
  priority = false,
} = defineProps<Props>()

const OVERLAY_CLASSES: Record<NonNullable<Props['overlay']>, string> = {
  none: '',
  bottom: 'bg-gradient-to-t from-black/70 via-black/10 to-transparent',
  // Uniforme (não só na base) — para composições com conteúdo espalhado por
  // toda a foto, não só ancorado embaixo (ex.: Hero.vue).
  full: 'bg-black/50',
}
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="fullBleed ? '' : 'rounded-lg'"
    :style="ratio ? { aspectRatio: ratio } : undefined"
  >
    <NuxtImg
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      :style="objectPosition ? { objectPosition } : undefined"
      :sizes="sizes"
      :preload="priority || undefined"
      :loading="priority ? undefined : 'lazy'"
      placeholder
    />
    <div
      v-if="overlay !== 'none'"
      aria-hidden="true"
      role="presentation"
      class="pointer-events-none absolute inset-0"
      :class="OVERLAY_CLASSES[overlay]"
    />
  </div>
</template>
