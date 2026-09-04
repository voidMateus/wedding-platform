<!--
  Cartão de seção da tela de Configurações. É a unidade que o sub-menu
  lateral endereça: cada cartão tem um `sectionId` e o link do menu é uma
  âncora para ele (daí o scroll-mt, que compensa o header fixo de 64px).

  Não é UiCard nem AdminPanel: UiCard não desenha título/descrição próprios
  e AdminPanel põe o título numa faixa separada por divisor, com o conteúdo
  encostando na borda — o oposto do que uma seção de formulário quer, que é
  título, subtítulo e campos respirando no mesmo bloco de padding.
-->
<script setup lang="ts">
interface Props {
  /**
   * Alvo da âncora do sub-menu lateral — precisa casar com o `sections[].id`
   * da aba. O `scroll-mt` do elemento é só uma folga: quem rola é o <main> do
   * layout, e o header do admin está fora desse scroller, então não há altura
   * de header sobrepondo o alvo para compensar.
   */
  sectionId: string
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <section
    :id="sectionId"
    class="scroll-mt-4 rounded-lg border border-border bg-surface-elevated p-5 shadow-sm md:p-6"
  >
    <div class="mb-5">
      <h2 class="font-display text-lg font-semibold text-text">{{ title }}</h2>
      <p v-if="description" class="mt-1 max-w-2xl text-sm text-text-muted">{{ description }}</p>
    </div>

    <!-- Coluna de apoio ("Como funciona") só entra a partir de xl: abaixo
         disso ela vira o último bloco da coluna única, depois dos campos. -->
    <div :class="$slots.aside && 'grid gap-6 xl:grid-cols-3'">
      <div class="flex flex-col gap-5" :class="$slots.aside && 'xl:col-span-2'">
        <slot />
      </div>
      <aside
        v-if="$slots.aside"
        class="h-fit rounded-md border border-border bg-surface-muted/60 p-4"
      >
        <p
          class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted"
        >
          <Icon name="lucide:info" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Como funciona
        </p>
        <div class="flex flex-col gap-2 text-sm leading-relaxed text-text-muted">
          <slot name="aside" />
        </div>
      </aside>
    </div>
  </section>
</template>
