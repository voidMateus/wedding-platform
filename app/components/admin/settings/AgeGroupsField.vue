<!--
  Editor das faixas da classificação etária do evento.

  Só as idades FINAIS são editáveis: a idade inicial de cada faixa é sempre a
  final da anterior + 1, recalculada aqui a cada mudança. É o que torna
  impossível montar "Criança 0–7 / Adolescente 5–17" (sobreposição) ou
  "Criança 0–7 / Adolescente 10–17" (idades 8 e 9 sem faixa) pela interface —
  a mesma regra que o servidor revalida em shared/schemas/wedding.ts, porque a
  interface nunca é a garantia.
-->
<script setup lang="ts">
import type { FaixaEtariaInput } from '#shared/schemas/wedding'
import { FAIXAS_ETARIAS_PADRAO, FAIXA_ETARIA_ROTULOS } from '#shared/utils/faixa-etaria'

interface Props {
  modelValue: FaixaEtariaInput[] | undefined
  error?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: FaixaEtariaInput[]] }>()

const faixas = computed<FaixaEtariaInput[]>(
  () => props.modelValue ?? FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
)

function rotulo(faixa: FaixaEtariaInput): string {
  return FAIXA_ETARIA_ROTULOS[faixa.chave]
}

/**
 * Reescreve a idade final de uma faixa e recompõe as demais em cascata. A
 * última faixa fica sempre aberta no topo (`idadeMaxima: null`) — sem isso a
 * classificação teria teto e ninguém acima dele seria classificado.
 */
function updateIdadeMaxima(index: number, texto: string) {
  const valor = texto === '' ? null : Number(texto)
  const atualizadas = faixas.value.map((faixa, i) =>
    i === index ? { ...faixa, idadeMaxima: valor } : { ...faixa },
  )

  let proximaMinima = 0
  atualizadas.forEach((faixa, i) => {
    faixa.idadeMinima = proximaMinima
    if (i === atualizadas.length - 1) {
      faixa.idadeMaxima = null
      return
    }
    // Esticar uma faixa por cima da seguinte empurra a seguinte, em vez de
    // deixar a tela num estado inválido que o casal teria que consertar à mão
    // (subir Criança para 17 deixava Adolescente em 18–17). Só as faixas
    // DEPOIS da editada são empurradas: a que ele está digitando mantém o que
    // foi digitado, senão o número mudaria embaixo do cursor.
    if (
      i > index &&
      typeof faixa.idadeMaxima === 'number' &&
      faixa.idadeMaxima < faixa.idadeMinima
    ) {
      faixa.idadeMaxima = faixa.idadeMinima
    }
    // Enquanto o casal digita, a idade final pode estar vazia ou abaixo da
    // inicial: mantém o que ele digitou (o erro do schema explica o problema)
    // e só avança a cascata quando o valor faz sentido.
    proximaMinima =
      typeof faixa.idadeMaxima === 'number' && faixa.idadeMaxima >= faixa.idadeMinima
        ? faixa.idadeMaxima + 1
        : faixa.idadeMinima
  })

  emit('update:modelValue', atualizadas)
}

function restoreDefault() {
  emit(
    'update:modelValue',
    FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
  )
}
</script>

<template>
  <!--
    O rótulo do grupo é "Faixas de idade", não "Classificação etária": o
    cartão da seção já se chama assim, e repetir o mesmo título dentro dele
    faz a tela parecer ter duas seções aninhadas.
  -->
  <AdminSettingsField label="Faixas de idade">
    <!--
      Lista com divisórias, rótulo à esquerda e o controle encostado à
      direita: é o que mantém os campos numéricos alinhados entre as linhas.
      Solto num flex, "de 0" e "de 60" têm larguras diferentes e empurravam
      cada input para uma posição — no celular, viravam quatro linhas
      desalinhadas.
    -->
    <ul class="divide-y divide-border overflow-hidden rounded-md border border-border">
      <!--
        Empilhado no celular, lado a lado a partir de sm: numa linha só, o
        rótulo mais longo ("Adolescente") não cabe junto com o controle e
        quebra só aquela linha, deixando a lista com alturas irregulares.
      -->
      <li
        v-for="(faixa, index) in faixas"
        :key="faixa.chave"
        class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:px-4 sm:py-2.5"
      >
        <span class="text-sm font-medium text-text">{{ rotulo(faixa) }}</span>

        <!-- Largura fixa a partir de sm: é o que alinha "de N", o campo e
             "anos" entre as quatro linhas, inclusive a última, que não tem
             campo. -->
        <div class="flex items-center gap-2 text-sm text-text-muted sm:w-60">
          <span class="whitespace-nowrap">
            de
            <span class="num inline-block w-5 text-right font-medium text-text">
              {{ faixa.idadeMinima }}</span
            >
          </span>

          <template v-if="index < faixas.length - 1">
            <span>até</span>
            <UiInput
              :model-value="faixa.idadeMaxima === null ? '' : String(faixa.idadeMaxima)"
              type="number"
              :aria-label="`Idade final da faixa ${rotulo(faixa)}`"
              class="w-20"
              @update:model-value="updateIdadeMaxima(index, $event)"
            />
            <span>anos</span>
          </template>
          <span v-else class="whitespace-nowrap">anos ou mais</span>
        </div>
      </li>
    </ul>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <UiButton type="button" size="sm" variant="ghost" class="self-start" @click="restoreDefault">
      Restaurar classificação padrão
    </UiButton>
  </AdminSettingsField>
</template>
