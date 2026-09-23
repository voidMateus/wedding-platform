<script setup lang="ts">
interface Props {
  tone?: 'success' | 'error' | 'info' | 'warning'
  message: string
  /** Rótulo da ação de volta ("Desfazer") — sem ele, o toast só informa. */
  actionLabel?: string
}

const { tone = 'info', message, actionLabel } = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
  action: []
}>()

// Fundo OPACO, e é o ponto do componente.
//
// Era `bg-<tom>/5` — 5% de tinta, 95% do que estiver atrás. E o que está atrás
// é quase sempre o overlay do `UiModal` (`bg-black/40`), porque o
// `UiToastViewport` é `z-[60]` de propósito, para o aviso não aparecer ATRÁS da
// janela que o provocou. O preto atravessava a tinta e o texto do toast caía
// para 2,0–2,2:1: exatamente na situação em que o aviso mais precisa ser lido.
//
// Achado por varredura automatizada, não por leitura de código: nenhum dos dois
// arquivos está errado sozinho — o defeito só existe na combinação.
//
// O tom agora vive na borda, no ícone e no texto, que sobre superfície opaca
// medem 6,5–7,1:1. A tinta de 5% não fazia falta visual nenhuma; ela era
// imperceptível justamente por ser 95% transparente.
const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  success: 'border-success/40 bg-surface-elevated text-success',
  error: 'border-danger/40 bg-surface-elevated text-danger',
  warning: 'border-warning/40 bg-surface-elevated text-warning',
  info: 'border-border bg-surface-elevated text-text',
}

const toneIcons: Record<NonNullable<Props['tone']>, string> = {
  success: 'lucide:check-circle',
  error: 'lucide:alert-circle',
  warning: 'lucide:alert-triangle',
  info: 'lucide:info',
}
</script>

<template>
  <div
    role="status"
    class="flex items-start gap-3 rounded-lg border p-3 shadow-md"
    :class="toneClasses[tone]"
  >
    <Icon :name="toneIcons[tone]" class="mt-0.5 h-4 w-4 shrink-0" />
    <p class="flex-1 text-sm">{{ message }}</p>
    <!-- Sublinhado e na cor do tom, não um botão com fundo: ele divide a linha
         com o "×" e um segundo botão sólido faria o cartão pedir duas decisões
         com o mesmo peso. -->
    <button
      v-if="actionLabel"
      type="button"
      class="shrink-0 rounded text-sm font-semibold text-current underline underline-offset-2 transition-brand hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
    <!-- Sem `opacity-60`: a 60% o "×" media 2,7-2,8:1 mesmo sobre fundo opaco, e
         `opacity-75` (o ajuste que a auditoria sugeriu) ainda dava 3,6-3,8:1.
         Opacidade não serve para hierarquizar texto colorido — quem dá o recuo
         aqui é o tamanho, e o realce vem do fundo no hover.
         h-6 w-6: é um controle, e 24x24 é o alvo mínimo. -->
    <button
      type="button"
      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-lg leading-none text-current transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      aria-label="Fechar"
      @click="emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
