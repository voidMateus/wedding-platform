<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { computeCountdownParts } from '#shared/countdown-units'

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
  /**
   * Unidades exibidas, da maior para a menor (`config_tema.countdownUnits`).
   * Ausente = as quatro de sempre. A variante 'hero' ignora esta prop: ela é
   * o número de dias do dashboard admin, não a faixa do casal.
   */
  units?: string[]
}

const { targetDateTime, variant = 'cards', units = undefined } = defineProps<Props>()

/**
 * O relógio, e por que os números carregam `data-allow-mismatch="text"`.
 *
 * Sob SSR o número é calculado no servidor e recalculado na hidratação, e
 * entre os dois instantes o tempo passa: medido no site público, o segundo
 * saía 22 do servidor e 20 do cliente. Vue tratava isso como divergência de
 * hidratação — o `Hydration completed but contains mismatches` que a página
 * pública emitia no console, e que escondia qualquer divergência de verdade
 * que aparecesse depois dele.
 *
 * `data-allow-mismatch="text"` é a declaração de que o texto DEVE divergir
 * aqui (Vue 3.5): o valor certo é sempre o do cliente, e o do servidor é só o
 * que evita o buraco na primeira pintura. As alternativas eram piores —
 * `<ClientOnly>` deixaria o Hero sem a contagem até hidratar (deslocamento de
 * layout em cima do elemento de LCP) e congelar o valor do servidor mostraria
 * um número velho. O `allow-mismatch` é por nó e só cobre o texto: estrutura
 * divergente continua sendo erro, que é o que se quer.
 */
const now = useNow({ interval: 1000 })

const target = computed(() => new Date(targetDateTime))
const diffMs = computed(() => Math.max(0, target.value.getTime() - now.value.getTime()))
const isPast = computed(() => target.value.getTime() - now.value.getTime() <= 0)

const days = computed(() => Math.floor(diffMs.value / (1000 * 60 * 60 * 24)))

// Quais números aparecem e quanto cada um vale sai inteiro do catálogo
// (shared/countdown-units.ts): é lá que mora a cascata — inclusive o mês, que
// é calendário e não "30 dias" — e a costura que impede um vão no meio da
// faixa engolir tempo em silêncio.
const parts = computed(() => computeCountdownParts(units, now.value, target.value))

/**
 * O que um leitor de tela realmente anuncia no lugar da grade de números.
 *
 * Os dígitos ficam `aria-hidden` e esta frase os substitui, por dois motivos:
 * lida célula a célula, a grade sai como "459 dias 02 horas 33 minutos 32
 * segundos" sem pontuação nenhuma; e, atualizando a cada segundo, ela seria
 * relida sem parar. Só os dias entram — é a informação que importa a quem não
 * está olhando o relógio na tela, é a única que não muda a cada segundo, e ela
 * independe das unidades que o casal escolheu exibir (quem escolhe "meses" não
 * deixa de querer saber que faltam 243 dias).
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
    <p data-allow-mismatch="text" class="sr-only">{{ accessibleLabel }}</p>
    <span
      aria-hidden="true"
      data-allow-mismatch="text"
      class="num text-7xl font-semibold leading-none tracking-tight text-text"
      >{{ days }}</span
    >
    <span
      aria-hidden="true"
      data-allow-mismatch="text"
      class="mb-1.5 font-display text-xl font-medium text-text-muted"
    >
      {{ days === 1 ? 'dia' : 'dias' }}
    </span>
  </div>

  <div
    v-else-if="variant === 'inline'"
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    aria-live="off"
    class="flex items-stretch gap-3 sm:gap-8"
  >
    <p data-allow-mismatch="text" class="sr-only">{{ accessibleLabel }}</p>
    <!--
      `aria-live="off"` explícito e `aria-hidden` nos dígitos: sem isso a
      contagem seria reanunciada a cada segundo. A frase acessível acima diz a
      mesma coisa uma vez só.
    -->
    <template v-for="(part, index) in parts" :key="part.id">
      <span
        v-if="index > 0"
        data-test="countdown-separator"
        class="w-px self-stretch bg-ornament/30"
        aria-hidden="true"
      />
      <div class="flex flex-col items-center gap-1" aria-hidden="true">
        <span
          data-allow-mismatch="text"
          class="font-display text-2xl leading-none text-heading tabular-nums sm:text-3xl"
        >
          {{ String(part.value).padStart(2, '0') }}
        </span>
        <span
          class="mt-1 text-[9px] tracking-[0.15em] text-text-muted uppercase sm:text-[10px] sm:tracking-[0.3em]"
        >
          {{ part.label }}
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
    <p data-allow-mismatch="text" class="sr-only">{{ accessibleLabel }}</p>
    <div
      v-for="part in parts"
      :key="part.id"
      aria-hidden="true"
      class="flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-3 shadow-sm sm:w-20"
    >
      <span
        data-allow-mismatch="text"
        class="font-display text-2xl font-semibold text-primary tabular-nums sm:text-3xl"
      >
        {{ String(part.value).padStart(2, '0') }}
      </span>
      <span class="text-xs uppercase tracking-wide text-text-muted">{{ part.label }}</span>
    </div>
  </div>
</template>
