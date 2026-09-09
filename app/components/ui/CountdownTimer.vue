<script setup lang="ts">
import { useNow } from '@vueuse/core'

interface Props {
  targetDateTime: string
  /**
   * 'cards' (default) = caixas com borda/sombra; 'inline' = números soltos
   * com separador, sensação de convite (Hero público); 'hero' = só os dias,
   * em número gigante, para o único bloco de peso visual do dashboard admin
   * (direção "livro de registro") — o rótulo e a data ficam por conta de
   * quem compõe a tela, aqui é só a contagem.
   */
  variant?: 'cards' | 'inline' | 'hero'
}

const { targetDateTime, variant = 'cards' } = defineProps<Props>()

const now = useNow({ interval: 1000 })

const target = computed(() => new Date(targetDateTime))
const diffMs = computed(() => Math.max(0, target.value.getTime() - now.value.getTime()))
const isPast = computed(() => target.value.getTime() - now.value.getTime() <= 0)

const days = computed(() => Math.floor(diffMs.value / (1000 * 60 * 60 * 24)))
const hours = computed(() => Math.floor((diffMs.value / (1000 * 60 * 60)) % 24))
const minutes = computed(() => Math.floor((diffMs.value / (1000 * 60)) % 60))
const seconds = computed(() => Math.floor((diffMs.value / 1000) % 60))

const units = computed(() => [
  { label: 'dias', value: days.value },
  { label: 'horas', value: hours.value },
  { label: 'minutos', value: minutes.value },
  { label: 'segundos', value: seconds.value },
])

/**
 * O que um leitor de tela realmente anuncia no lugar da grade de números.
 *
 * Os dígitos ficam `aria-hidden` e esta frase os substitui, por dois motivos:
 * lida célula a célula, a grade sai como "459 dias 02 horas 33 minutos 32
 * segundos" sem pontuação nenhuma; e, atualizando a cada segundo, ela seria
 * relida sem parar. Só os dias entram — é a informação que importa a quem não
 * está olhando o relógio na tela, e é a única que não muda a cada segundo.
 */
const accessibleLabel = computed(() => {
  if (isPast.value) return 'O grande dia chegou!'
  if (days.value === 0) return 'O casamento é hoje.'
  return `Faltam ${days.value} ${days.value === 1 ? 'dia' : 'dias'} para o casamento.`
})
</script>

<template>
  <div v-if="isPast">
    <slot name="past">
      <p class="text-text-muted">O grande dia chegou!</p>
    </slot>
  </div>
  <div v-else-if="variant === 'hero'" class="flex items-end gap-2">
    <p class="sr-only">{{ accessibleLabel }}</p>
    <span
      aria-hidden="true"
      class="num text-7xl font-semibold leading-none tracking-tight text-text"
      >{{ days }}</span
    >
    <span aria-hidden="true" class="mb-1.5 font-display text-xl font-medium text-text-muted">
      {{ days === 1 ? 'dia' : 'dias' }}
    </span>
  </div>

  <div
    v-else-if="variant === 'inline'"
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    aria-live="off"
    class="flex items-stretch gap-5 sm:gap-8"
  >
    <p class="sr-only">{{ accessibleLabel }}</p>
    <!--
      `aria-live="off"` explícito e `aria-hidden` nos dígitos: sem isso a
      contagem seria reanunciada a cada segundo. A frase acessível acima diz a
      mesma coisa uma vez só.
    -->
    <template v-for="(unit, index) in units" :key="unit.label">
      <span
        v-if="index > 0"
        data-test="countdown-separator"
        class="w-px self-stretch bg-ornament/30"
        aria-hidden="true"
      />
      <div class="flex flex-col items-center gap-1" aria-hidden="true">
        <span class="font-display text-2xl leading-none text-heading tabular-nums sm:text-3xl">
          {{ String(unit.value).padStart(2, '0') }}
        </span>
        <span class="mt-1 text-[10px] uppercase tracking-[0.3em] text-text-muted">
          {{ unit.label }}
        </span>
      </div>
    </template>
  </div>

  <div
    v-else
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    aria-live="off"
    class="flex gap-3 sm:gap-4"
  >
    <p class="sr-only">{{ accessibleLabel }}</p>
    <div
      v-for="unit in units"
      :key="unit.label"
      aria-hidden="true"
      class="flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-3 shadow-sm sm:w-20"
    >
      <span class="font-display text-2xl font-semibold text-primary tabular-nums sm:text-3xl">
        {{ String(unit.value).padStart(2, '0') }}
      </span>
      <span class="text-xs uppercase tracking-wide text-text-muted">{{ unit.label }}</span>
    </div>
  </div>
</template>
