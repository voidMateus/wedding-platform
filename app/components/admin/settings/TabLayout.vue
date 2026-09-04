<!--
  Moldura de duas colunas da tela de Configurações: sub-menu das seções da
  aba ativa à esquerda (fixo na rolagem), conteúdo à direita. Em telas
  menores o sub-menu vira uma faixa de chips rolável acima do conteúdo.

  Os links são âncoras nativas (<a href="#id">), não NuxtLink: o destino é
  uma seção da própria página, e é o `scroll-mt` do AdminSettingsSectionCard
  que compensa o header fixo.
-->
<script setup lang="ts">
interface SectionLink {
  id: string
  label: string
}

interface Props {
  /** Rótulo da aba ativa — cabeçalho do sub-menu. */
  label: string
  /** Uma linha sobre o que a aba trata. */
  blurb: string
  sections: SectionLink[]
}

defineProps<Props>()
</script>

<template>
  <div class="lg:flex lg:items-start lg:gap-6">
    <!-- w-48 (12rem) é a coluna do modelo. `top-4` e não `top-20`: o scroller
         agora é o <main> do layout, e o header do admin fica fora dele — não
         há mais altura de header para compensar, só uma folga de respiro. -->
    <nav
      class="hidden lg:sticky lg:top-4 lg:block lg:w-48 lg:shrink-0"
      :aria-label="`Seções de ${label}`"
    >
      <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {{ label }}
      </p>
      <p class="px-3 pb-3 text-xs leading-relaxed text-text-muted">{{ blurb }}</p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="section in sections" :key="section.id">
          <a
            :href="`#${section.id}`"
            class="block rounded-md px-3 py-1.5 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {{ section.label }}
          </a>
        </li>
      </ul>
    </nav>

    <div class="min-w-0 flex-1">
      <!-- Aba de uma seção só não ganha faixa de chips: não há para onde navegar. -->
      <div
        v-if="sections.length > 1"
        class="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
      >
        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="shrink-0 whitespace-nowrap rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {{ section.label }}
        </a>
      </div>

      <slot />
    </div>
  </div>
</template>
