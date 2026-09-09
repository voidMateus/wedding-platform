<script setup lang="ts">
// Cabeçalho das páginas públicas que não são a home — presentes, RSVP,
// galeria. Dá a elas o mesmo tratamento de "capítulo" que
// PublicEditorialSection dá às seções: eyebrow miúdo em caixa alta, título em
// display e o filete de ornamento embaixo.
//
// Existe como componente porque três páginas precisam exatamente disso (a
// regra do projeto pede 2+ contextos reais antes de promover). Antes cada uma
// montava o próprio cabeçalho com corpo e espaçamento diferentes, e as três
// pareciam de sites diferentes ao lado da home.
//
// Não reusa PublicEditorialSection porque ali o título é um `<h2>` — uma
// seção dentro da página. Aqui é o `<h1>`: o assunto da página inteira.
interface Props {
  /** Rótulo curto acima do título ("Para essa nova fase", "R.S.V.P"). */
  eyebrow?: string
  title: string
  description?: string
  /** Destino do link "Voltar ao site" — omitido, o link não aparece. */
  backTo?: string
  backLabel?: string
}

const { eyebrow, title, description, backTo, backLabel = 'Voltar ao site' } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" aria-hidden="true" />
      {{ backLabel }}
    </NuxtLink>

    <div class="flex flex-col items-center gap-3 text-center">
      <p v-if="eyebrow" class="text-[10px] tracking-[0.4em] text-text-muted uppercase">
        {{ eyebrow }}
      </p>
      <h1 class="font-display text-3xl font-semibold text-heading sm:text-4xl">{{ title }}</h1>
      <UiSectionDivider />
      <p v-if="description" class="mt-2 max-w-2xl leading-relaxed text-body">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>
