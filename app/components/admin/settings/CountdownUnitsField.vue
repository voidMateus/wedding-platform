<!--
  Contagem regressiva: o switch mestre liga/desliga a faixa e, ligada, revela
  uma chave por unidade do catálogo mais a prévia com a data real do casal.

  A faixa não pode ter buraco: marcar uma unidade distante acende as do meio
  (menos a semana, a única pulável — ver shared/countdown-units.ts), e
  desmarcar uma do meio corta dali para baixo em vez de abrir o vão. Quem
  decide isso é `resolveCountdownUnits()`, o mesmo resolvedor da renderização —
  aqui ele é só antecipado para a tela, para o casal ver o efeito no clique em
  vez de descobrir no site que o número do meio mudou sozinho.

  O "desligado" continua sendo `showCountdown`, e não uma lista vazia: a lista
  vazia seria uma contagem sem número nenhum, que não é o mesmo que não ter
  contagem.
-->
<script setup lang="ts">
import {
  COUNTDOWN_UNIT_CATALOG,
  COUNTDOWN_UNIT_IDS,
  findCountdownUnit,
  resolveCountdownUnits,
} from '#shared/countdown-units'

interface Props {
  /** `config_tema.showCountdown` — a faixa inteira aparece no site? */
  enabled: boolean
  /** `config_tema.countdownUnits`. */
  modelValue: string[] | undefined
  /** Data/hora do evento, para a prévia mostrar os números de verdade. */
  targetDateTime?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:modelValue': [value: string[]]
}>()

// Resolvido, nunca o valor cru: é o que garante que a tela mostre a mesma
// faixa que o site — inclusive quando o valor salvo veio com um vão (seleção
// antiga, ou id que saiu do catálogo).
const selected = computed(() => resolveCountdownUnits(props.modelValue))

function indexOf(id: string): number {
  return COUNTDOWN_UNIT_IDS.indexOf(id as (typeof COUNTDOWN_UNIT_IDS)[number])
}

function isSelected(id: string): boolean {
  return selected.value.some((unitId) => unitId === id)
}

/** A última unidade ligada não pode ser desligada — faixa vazia não é um estado. */
function isLocked(id: string): boolean {
  return selected.value.length === 1 && isSelected(id)
}

function toggleUnit(id: string, on: boolean) {
  if (indexOf(id) < 0) return

  // Ligar é só acrescentar: o resolvedor estende a faixa até a unidade marcada
  // e acende o que faltava no meio.
  if (on) {
    emit('update:modelValue', resolveCountdownUnits([...selected.value, id]))
    return
  }

  if (isLocked(id)) return

  emit('update:modelValue', resolveCountdownUnits(unitsAfterTurningOff(id)))
}

/**
 * Desligar tem três casos, e nenhum deles pode deixar um vão que o resolvedor
 * fosse reacender no próximo clique (a unidade "voltaria" sozinha):
 * a semana sai sozinha, por ser pulável; a MAIOR unidade sai sozinha, porque o
 * que fica continua contínuo; qualquer outra leva junto tudo que é menor que
 * ela — é o gesto de "quero menos detalhe", e o único corte sem buraco.
 */
function unitsAfterTurningOff(id: string): string[] {
  if (findCountdownUnit(id)?.skippable) {
    return selected.value.filter((unitId) => unitId !== id)
  }

  if (id === selected.value[0]) return selected.value.slice(1)

  return selected.value.filter((unitId) => indexOf(unitId) < indexOf(id))
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <AdminSettingsToggleRow
      :model-value="enabled"
      label="Contagem regressiva"
      hint="A faixa com o tempo que falta até o evento, logo abaixo da data no topo do site."
      @update:model-value="(value) => emit('update:enabled', value)"
    />

    <div v-if="enabled" class="flex flex-col gap-3 pl-0 sm:pl-4">
      <p class="text-xs leading-relaxed text-text-muted">
        Escolha o que aparece na faixa. As unidades entre a maior e a menor entram junto — sem os
        dias entre meses e horas, o dia que falta sumiria da conta. A semana é a exceção: ela entra
        só se você quiser.
      </p>

      <div class="grid gap-2 sm:grid-cols-2">
        <AdminSettingsToggleRow
          v-for="unit in COUNTDOWN_UNIT_CATALOG"
          :key="unit.id"
          :model-value="isSelected(unit.id)"
          :label="unit.adminLabel"
          :disabled="isLocked(unit.id)"
          @update:model-value="(on) => toggleUnit(unit.id, on)"
        />
      </div>

      <div
        v-if="targetDateTime"
        class="flex flex-col items-center gap-2 rounded-md border border-border bg-surface-muted/40 px-4 py-4"
      >
        <p class="text-xs tracking-wide text-text-muted uppercase">Prévia</p>
        <UiCountdownTimer :target-date-time="targetDateTime" :units="selected" variant="inline">
          <template #past>
            <p class="text-sm text-text-muted">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </div>
    </div>
  </div>
</template>
