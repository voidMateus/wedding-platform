<!--
  O atalho que transforma o site num Save the Date.

  Com capa, contagem regressiva e cronograma, o produto já servia de Save the
  Date — mas só para quem soubesse montar isso sozinho, ligando as seções
  certas uma a uma. As seções nascem TODAS desligadas (decisão de 2026-09-14),
  então o caminho existia por acaso, e acaso não é caminho (rodada de
  usabilidade de 20/09/2026, ponto 28).

  **A prévia vem antes de aplicar**, e não é zelo: o site pode já estar no ar, e
  mexer nele sem dizer o que muda é a diferença entre um atalho e uma surpresa.

  **O combo só ACRESCENTA.** Quem já tinha "Nossa História" ligada não a perde
  por pedir um save the date — desligar o que o casal escolheu seria caro, e
  este atalho não tem informação para decidir isso por ele.
-->
<script setup lang="ts">
import { aplicarSaveTheDate, simularSaveTheDate } from '#shared/save-the-date'

interface Props {
  ativas: string[]
  contagemLigada: boolean
}

const { ativas, contagemLigada } = defineProps<Props>()

const emit = defineEmits<{
  aplicar: [payload: { secoes: string[]; ligarContagem: boolean }]
}>()

const mudanca = computed(() => simularSaveTheDate(ativas, contagemLigada))

const naoMudaNada = computed(
  () => mudanca.value.secoesParaLigar.length === 0 && !mudanca.value.ligaContagem,
)

function aplicar() {
  emit('aplicar', {
    secoes: aplicarSaveTheDate(ativas),
    ligarContagem: mudanca.value.ligaContagem,
  })
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-text">Usar como Save the Date</p>
      <p class="text-xs text-text-muted">
        Liga o essencial para avisar a data antes do convite: quem está casando, quanto falta, e
        onde vai ser.
      </p>
    </div>

    <p v-if="naoMudaNada" class="text-xs text-text-muted">Seu site já tem tudo isso ligado.</p>

    <ul v-else class="flex flex-col gap-1 text-xs text-text-muted">
      <li v-for="secao in mudanca.secoesParaLigar" :key="secao" class="flex items-center gap-1.5">
        <Icon name="lucide:plus" class="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
        Liga a seção <strong class="font-medium text-text">{{ secao }}</strong>
      </li>
      <li v-if="mudanca.ligaContagem" class="flex items-center gap-1.5">
        <Icon name="lucide:plus" class="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
        Liga a <strong class="font-medium text-text">contagem regressiva</strong> na capa
      </li>
      <!-- Dizer o que NÃO muda é metade da prévia: sem esta linha, "aplicar"
           parece que pode desligar o que já está ligado. -->
      <li v-if="mudanca.jaLigadas.length" class="flex items-center gap-1.5">
        <Icon name="lucide:check" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Já ligadas, sem mudança: {{ mudanca.jaLigadas.join(', ') }}
      </li>
    </ul>

    <div v-if="!naoMudaNada">
      <UiButton size="sm" variant="ghost" @click="aplicar">
        <Icon name="lucide:calendar-heart" class="h-4 w-4" />
        Aplicar
      </UiButton>
    </div>
  </div>
</template>
