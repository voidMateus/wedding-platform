<!--
  "Imprimir" — e é também o caminho para PDF: "Salvar como PDF" é um destino de
  impressão em todo navegador atual. Por isso não existe um botão "Exportar
  PDF" separado: seriam dois rótulos para o mesmo diálogo, e o segundo exigiria
  uma biblioteca de geração de PDF no bundle do casal para redesenhar, pior,
  uma tabela que o navegador já sabe paginar.

  A folha em si é a própria tela, com a chrome escondida — ver o bloco
  `@media print` em `app/assets/css/main.css`.

  Sai do papel junto com o resto da barra de ações (`no-print`): um botão
  "Imprimir" impresso é ruído puro.
-->
<script setup lang="ts">
interface Props {
  /** Rótulo alternativo — "Imprimir mapa de mesas", por exemplo. */
  label?: string
  disabled?: boolean
}

const { label = 'Imprimir', disabled = false } = defineProps<Props>()

function imprimir() {
  window.print()
}
</script>

<template>
  <UiButton variant="ghost" class="no-print" :disabled="disabled" @click="imprimir">
    <Icon name="lucide:printer" class="h-4 w-4" />
    {{ label }}
  </UiButton>
</template>
