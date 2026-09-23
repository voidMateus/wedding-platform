<!--
  Tooltip: a explicação que aparece ao passar o mouse.

  **É sempre DESCRIÇÃO, nunca o nome do controle.** Um botão de ícone precisa de
  `aria-label` próprio; o tooltip acrescenta o porquê, não a identidade. Trocar
  os dois papéis deixa o controle anônimo para quem navega por leitor de tela e
  para quem nunca vai passar o mouse.

  Daí o `aria-describedby`, que o Reka aplica sozinho — e nunca
  `aria-labelledby`. A lição do `CLAUDE.md` seção 13 vale aqui inteira: nome
  acessível não se apoia em id, porque `for`/`labelledby` atravessam duas
  passagens de render e sob SSR + hidratação podem apontar para um elemento que
  já não existe. Descrição pode: se ela se perder, o controle continua nomeado.

  **No toque, tooltip não existe.** Não há hover no celular, e o primitive só
  abre por foco — que num toque só acontece depois de o controle já ter sido
  acionado. Por isso a regra do design system: informação NECESSÁRIA vira texto
  visível; tooltip é para o que ajuda quem quer saber mais. Quem escreve um
  tooltip está escolhendo que aquilo não apareça no celular.

  Sem `TooltipArrow`: a seta cobra um segundo elemento posicionado por linha de
  tabela, e a proximidade já diz de quem é o balão.

  O `TooltipProvider` que o primitive exige vive no `app.vue`, uma vez — é ele
  que faz o segundo balão abrir sem atraso quando o cursor passa de um controle
  para o vizinho.
-->
<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

interface Props {
  /** O texto da explicação — uma frase, não um parágrafo. */
  texto: string
  /**
   * Atraso até abrir, em milissegundos.
   *
   * 300ms porque o cursor atravessa controles a caminho de outro: sem atraso, a
   * tela pisca balões enquanto alguém só passa o mouse indo para o botão da
   * ponta.
   */
  atraso?: number
  lado?: 'top' | 'right' | 'bottom' | 'left'
}

const { texto, atraso = 300, lado = 'top' } = defineProps<Props>()
</script>

<template>
  <TooltipRoot :delay-duration="atraso">
    <!-- `as-child`: o gatilho é o próprio controle do slot, e não um wrapper.
         Um `<span>` a mais entre a célula e o botão mudaria o layout de toda
         linha que usar isto. -->
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>

    <TooltipPortal>
      <TooltipContent
        :side="lado"
        :side-offset="6"
        class="z-60 max-w-xs rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs leading-relaxed text-text shadow-lg"
      >
        {{ texto }}
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
