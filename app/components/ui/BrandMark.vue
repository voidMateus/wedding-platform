<!--
  A assinatura do produto — o "&" do convite mais o nome.

  Existe porque três telas da casca autenticada precisam dizer em que produto
  se está, e nenhuma delas tem um casamento para mostrar no lugar: a porta de
  entrada (login), a lista de eventos da conta e o painel interno da equipe.
  Dentro de `/admin/{slug}` ela nunca aparece — lá a identidade do cabeçalho é
  a do casamento, que é o que quem está dentro precisa saber.

  O símbolo sai em `font-display`, então fala a língua do contexto: Playfair na
  coluna de marca do login (dentro de `.superficie-do-convite`) e Sora no
  cabeçalho do painel. É a mesma peça, com o sotaque do lugar.
-->
<script setup lang="ts">
import { NOME_DO_PRODUTO, SIMBOLO_DA_MARCA } from '#shared/marca'

interface Props {
  /** `sm` é a assinatura de cabeçalho; `lg`, a da porta de entrada. */
  tamanho?: 'sm' | 'lg'
  /** Linha de contexto abaixo do nome ("Painel interno"). */
  legenda?: string
}

const { tamanho = 'sm' } = defineProps<Props>()
</script>

<template>
  <span class="flex items-center gap-3">
    <span
      class="grid shrink-0 place-items-center rounded-full bg-primary font-display leading-none text-primary-foreground"
      :class="tamanho === 'lg' ? 'h-16 w-16 text-3xl' : 'h-9 w-9 text-base'"
      aria-hidden="true"
    >
      {{ SIMBOLO_DA_MARCA }}
    </span>
    <span class="min-w-0 leading-tight">
      <span
        class="block truncate font-display font-semibold text-text"
        :class="tamanho === 'lg' ? 'text-2xl' : 'text-sm'"
      >
        {{ NOME_DO_PRODUTO }}
      </span>
      <span v-if="legenda" class="block truncate text-xs text-text-muted">{{ legenda }}</span>
    </span>
  </span>
</template>
