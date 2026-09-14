<!--
  A capa do site, em miniatura, com as cores e a tipografia de um preset.

  Existe porque escolher entre "Borgonha Editorial" e "Natural Orgânico" por
  dois pontinhos de cor é escolher no escuro: o que muda de verdade entre os
  presets é a FONTE dos nomes e o tom do ornamento, e nenhum dos dois cabe num
  círculo.

  Fiel de propósito, e não "inspirado no" site:

  - os nomes saem de `dividirNomesCasal`, o mesmo helper do Hero, então quem
    tem "Ana & João" vê três linhas e quem tem um nome fora do padrão vê uma;
  - o "&" é ornamento (`--color-ornament`, que cai em `--color-secondary`
    quando o preset não traz um), em itálico e a 0.45em — como no Hero;
  - a classe `previa-do-site` desfaz o escopo tipográfico e de neutros do
    painel. Sem ela, a prévia apareceria no cinza e na fonte do admin, que é
    justamente o que ela promete não ser.

  As famílias do catálogo já vão no CSS de build (ver `[data-font-catalog]` em
  main.css), então trocar `--font-display` aqui não baixa nada além do arquivo
  da família que está sendo mostrada.
-->
<script setup lang="ts">
import { dividirNomesCasal } from '#shared/utils/nomes-casal'
import { findFontPair } from '#shared/theme-presets'
import type { ThemePreset } from '#shared/theme-presets'

interface Props {
  preset: ThemePreset
  /** "Ana & João" — os nomes reais, nunca um exemplo: a prévia é do site DELES. */
  nomesNoivos: string
  /** `YYYY-MM-DD`; ausente, a linha da data não aparece. */
  dataEvento?: string
}

const { preset, nomesNoivos, dataEvento = '' } = defineProps<Props>()

const partesDoNome = computed(() => dividirNomesCasal(nomesNoivos))

const estilo = computed(() => {
  const par = findFontPair(preset.fontPairId)
  return {
    '--color-primary': preset.primaryColor,
    '--color-secondary': preset.secondaryColor,
    // Mesma regra do site: sem ornamento próprio, o ornamento é a secundária.
    '--color-ornament': preset.ornamentColor ?? preset.secondaryColor,
    '--font-display': par ? `'${par.displayFontFamily}', Georgia, serif` : undefined,
  }
})

// Meia-noite local explícita: `new Date('2027-12-11')` seria lido como UTC e
// voltaria um dia em fuso negativo — o mesmo cuidado do Hero e do painel.
const dataPorExtenso = computed(() => {
  if (!dataEvento) return ''
  return new Date(`${dataEvento}T00:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase()
})
</script>

<template>
  <div
    class="previa-do-site flex aspect-[4/3] flex-col items-center justify-center gap-1 overflow-hidden rounded-md bg-surface-muted px-3 py-4 text-center"
    :style="estilo"
  >
    <span class="h-px w-6 bg-ornament" aria-hidden="true" />

    <p
      v-if="partesDoNome"
      class="font-display font-semibold leading-[1.05] text-heading"
      style="font-size: clamp(0.95rem, 2.4vw, 1.35rem)"
    >
      <span class="block">{{ partesDoNome.primeiro }}</span>
      <span class="block py-0.5 text-[0.45em] font-normal italic leading-none text-ornament">
        &amp;
      </span>
      <span class="block">{{ partesDoNome.segundo }}</span>
    </p>
    <p
      v-else
      class="font-display font-semibold leading-tight text-heading"
      style="font-size: clamp(0.85rem, 2vw, 1.1rem)"
    >
      {{ nomesNoivos }}
    </p>

    <p v-if="dataPorExtenso" class="mt-1 text-[0.5rem] tracking-[0.18em] text-text-muted">
      {{ dataPorExtenso }}
    </p>

    <span class="mt-1.5 rounded-full bg-primary px-2.5 py-1 text-[0.5rem] text-surface-elevated">
      Confirmar presença
    </span>
  </div>
</template>
