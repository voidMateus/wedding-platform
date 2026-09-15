<!--
  A sugestão clicável — "+ Fechar a banda ou o DJ", "+ Som e iluminação de
  pista", "+ Lembrete de RSVP".

  ## Por que existe

  A mesma classe Tailwind estava copiada em TRÊS arquivos, byte a byte
  (Planejamento, Financeiro e Comunicações), contra a regra do CLAUDE.md §13 de
  não repetir estilo fora de `components/ui/`. Três contextos reais é exatamente
  o gatilho que a §5 pede para promover um componente — não é abstração
  especulativa, é uma duplicata que já existia.

  ## O que mudou em relação à versão copiada

  A auditoria classificou a sugestão como "quase invisível" e o número explica
  por quê: o texto passava folgado (5,57:1), mas a SILHUETA não existia. A borda
  era `border-dashed border-border` — `#e3e3e8` sobre `#f4f4f6`, **1,16:1**.
  Nada ali dizia "isto é clicável"; lia-se como legenda solta.

  Três coisas dão corpo ao chip agora, e cada uma tem um motivo medido:

  1. **Preenchimento sólido** (`bg-surface-elevated`) — o chip passa a ter
     recorte próprio contra o fundo da página, em vez de depender só do
     contorno.
  2. **Borda de verdade** (`border-text-muted/70` = 3,17:1) — acima do mínimo de
     3:1 que o WCAG 1.4.11 pede para o contorno de um controle. `--color-border`
     não serve para isso: a 1,16:1 ele é um separador, nunca uma moldura.
  3. **Texto em `text-text`** (16,99:1) — `text-text-muted` fica reservado ao
     rótulo estático que apresenta a fila ("Costuma entrar aqui:"), que é
     contexto e não ação.

  O "+" sai em `text-primary` para dizer o que o clique faz. É a única cor do
  chip que varia por casamento, e o validador da plataforma já garante o mínimo
  dela contra a superfície.

  `min-h-6` (24px) porque o chip medido tinha 22px de altura — abaixo do alvo
  mínimo, e ele aparece em tela de celular.

  A borda deixou de ser tracejada. Ela existia para dizer "ainda não é nada",
  mas metade da presença visual de uma borda sólida era metade do que faltava:
  quem lia o rodapé não via ali um botão.
-->
<script setup lang="ts">
interface Props {
  /** O texto da sugestão, sem o "+" — o sinal é desenhado pelo componente. */
  label: string
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <!--
    `aria-label="Adicionar <rótulo>"`, e não o rótulo cru.

    O "+" é sinal VISUAL: lido em voz alta como "mais" só acrescenta ruído, por
    isso fica `aria-hidden`. Mas tirá-lo sem pôr nada no lugar deixava o botão
    com o mesmo nome do item que ele cria — no Planejamento, a sugestão
    "Fechar a banda ou o DJ" e a tarefa homônima passariam a se anunciar
    igual. O verbo resolve as duas coisas de uma vez: diz o que o clique faz e
    distingue a sugestão do que já existe.
  -->
  <button
    type="button"
    :aria-label="`Adicionar ${label}`"
    class="inline-flex min-h-6 items-center gap-1 rounded-md border border-text-muted/70 bg-surface-elevated px-2 py-0.5 text-text transition-brand hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    @click="emit('click')"
  >
    <span aria-hidden="true" class="font-medium text-primary">+</span>
    {{ label }}
  </button>
</template>
