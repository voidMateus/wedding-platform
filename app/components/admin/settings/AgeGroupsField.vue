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
import {
  FAIXAS_ETARIAS_PADRAO,
  FAIXA_ETARIA_ROTULOS,
  IDADE_MAXIMA_SUPORTADA,
} from '#shared/utils/faixa-etaria'

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
  <AdminSettingsField
    label="Classificação etária"
    hint="A classificação de cada convidado é calculada com base na idade dele na data do casamento — mudar estes limites reclassifica a lista inteira, sem alterar nenhum convidado."
  >
    <ul class="flex flex-col gap-3">
      <li
        v-for="(faixa, index) in faixas"
        :key="faixa.chave"
        class="flex flex-wrap items-center gap-2"
      >
        <span class="w-32 text-sm font-medium text-text">{{ rotulo(faixa) }}</span>

        <span class="text-sm text-text-muted">
          de <span class="num font-medium text-text">{{ faixa.idadeMinima }}</span>
        </span>

        <template v-if="index < faixas.length - 1">
          <span class="text-sm text-text-muted">até</span>
          <UiInput
            :model-value="faixa.idadeMaxima === null ? '' : String(faixa.idadeMaxima)"
            type="number"
            :aria-label="`Idade final da faixa ${rotulo(faixa)}`"
            class="w-24"
            @update:model-value="updateIdadeMaxima(index, $event)"
          />
          <span class="text-sm text-text-muted">anos</span>
        </template>
        <span v-else class="text-sm text-text-muted">anos ou mais</span>
      </li>
    </ul>

    <p v-if="error" class="text-xs text-danger" role="alert">{{ error }}</p>

    <div class="flex items-center gap-3">
      <UiButton type="button" size="sm" variant="ghost" @click="restoreDefault">
        Restaurar classificação padrão
      </UiButton>
      <span class="text-xs text-text-muted">
        Padrão: 0 a {{ FAIXAS_ETARIAS_PADRAO[0]?.idadeMaxima }} / até
        {{ FAIXAS_ETARIAS_PADRAO[1]?.idadeMaxima }} / até
        {{ FAIXAS_ETARIAS_PADRAO[2]?.idadeMaxima }} / acima disso. Limite máximo aceito:
        {{ IDADE_MAXIMA_SUPORTADA }} anos.
      </span>
    </div>
  </AdminSettingsField>
</template>
