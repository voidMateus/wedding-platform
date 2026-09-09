<script setup lang="ts">
// Monograma do casal — a assinatura recorrente do convite impresso (Fase
// Rebrand do Convite): capa, topo da navegação, rodapé.
//
// Dois caminhos, na ordem: a arte enviada pelo casal
// (config_tema.monogramImageUrl), ou, na falta dela, as iniciais derivadas de
// "Nome1 & Nome2" com um coração de ornamento no meio. O fallback não é um
// consolo — é o comportamento normal, porque a maioria dos casais não tem um
// monograma desenhado, e o site precisa ficar de pé sem um.
//
// Nomes fora do padrão "Nome1 & Nome2" (um nome só, três nomes) não rendem
// iniciais confiáveis; nesse caso o componente não renderiza nada em vez de
// inventar uma letra errada e carimbá-la no site inteiro.
import { iniciaisCasal } from '#shared/utils/nomes-casal'

interface Props {
  coupleNames?: string | null
  /** Arte própria do casal — quando presente, substitui as iniciais por completo. */
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const { coupleNames, imageUrl, size = 'md' } = defineProps<Props>()

const initials = computed(() => iniciaisCasal(coupleNames))

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-lg gap-1',
  md: 'text-2xl gap-1.5',
  lg: 'text-4xl gap-2',
}

const HEART_SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-5 w-5',
}

const IMAGE_SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-7',
  md: 'h-10',
  lg: 'h-16',
}
</script>

<template>
  <!--
    A arte enviada é sempre <img> comum, nunca NuxtImg: o monograma é uma
    marca chapada de poucos KB, e passá-la pelo redimensionador só somaria uma
    volta pelo IPX sem economizar byte nenhum. `alt` vazio + aria-hidden
    porque o nome do casal já está escrito ao lado em toda posição em que o
    monograma aparece — anunciá-lo de novo é ruído para quem usa leitor de tela.
  -->
  <img
    v-if="imageUrl"
    :src="imageUrl"
    alt=""
    aria-hidden="true"
    class="w-auto select-none object-contain"
    :class="IMAGE_SIZE_CLASSES[size]"
  />

  <span
    v-else-if="initials"
    data-test="monogram-initials"
    aria-hidden="true"
    class="inline-flex select-none items-center font-display leading-none text-heading"
    :class="SIZE_CLASSES[size]"
  >
    {{ initials.primeiro }}
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      class="text-ornament"
      :class="HEART_SIZE_CLASSES[size]"
      aria-hidden="true"
    >
      <path
        d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.4 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z"
      />
    </svg>
    {{ initials.segundo }}
  </span>
</template>
