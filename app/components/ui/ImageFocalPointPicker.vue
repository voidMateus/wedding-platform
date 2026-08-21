<script setup lang="ts">
// Ferramenta de enquadramento (CLAUDE.md, seção 22.2) — escolhe qual ponto
// da foto fica visível quando ela é cortada em proporções fixas (grade da
// galeria, foto da capa, foto da "Nossa História"). A área de seleção mostra
// a foto INTEIRA (sem cortar) para que o clique/arraste corresponda 1:1 às
// coordenadas reais da imagem — cortar a prévia aqui (object-cover)
// impediria escolher um foco que já estivesse fora da área visível. A prévia
// do corte real fica num segundo bloco, à parte, só para conferência visual.
interface FocalPoint {
  x: number
  y: number
}

interface Props {
  src: string
  modelValue: FocalPoint
  alt?: string
  /** Proporção do corte real onde a foto é usada (só a prévia; não afeta a área de seleção). */
  previewAspectClass?: string
}

const { src, modelValue, alt = '', previewAspectClass = 'aspect-square' } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: FocalPoint]
}>()

const imageRef = ref<HTMLImageElement | null>(null)
const isDragging = ref(false)

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function updateFromPointer(event: PointerEvent) {
  const el = imageRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100)
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100)
  emit('update:modelValue', { x, y })
}

function handlePointerDown(event: PointerEvent) {
  isDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  updateFromPointer(event)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  updateFromPointer(event)
}

function handlePointerUp() {
  isDragging.value = false
}

const FOCAL_STEP = 5
const KEY_DELTAS: Record<string, FocalPoint> = {
  ArrowLeft: { x: -FOCAL_STEP, y: 0 },
  ArrowRight: { x: FOCAL_STEP, y: 0 },
  ArrowUp: { x: 0, y: -FOCAL_STEP },
  ArrowDown: { x: 0, y: FOCAL_STEP },
}

function handleKeydown(event: KeyboardEvent) {
  const delta = KEY_DELTAS[event.key]
  if (!delta) return
  event.preventDefault()
  emit('update:modelValue', {
    x: clamp(modelValue.x + delta.x),
    y: clamp(modelValue.y + delta.y),
  })
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row">
    <div class="flex-1">
      <div
        class="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        tabindex="0"
        role="group"
        aria-label="Ponto de foco da imagem — clique, arraste ou use as setas do teclado para ajustar o enquadramento"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @keydown="handleKeydown"
      >
        <img ref="imageRef" :src="src" :alt="alt" class="pointer-events-none block w-full" draggable="false" />
        <span
          class="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-md"
          :style="{ left: `${modelValue.x}%`, top: `${modelValue.y}%` }"
          aria-hidden="true"
        />
      </div>
      <p class="mt-1 text-xs text-text-muted">
        Clique, arraste ou use as setas do teclado para escolher o melhor enquadramento.
      </p>
    </div>

    <div class="flex flex-col gap-1 sm:w-32">
      <span class="text-xs font-medium text-text-muted">Prévia do corte</span>
      <div :class="['w-full overflow-hidden rounded-lg border border-border', previewAspectClass]">
        <img
          :src="src"
          :alt="alt"
          class="h-full w-full object-cover"
          :style="{ objectPosition: `${modelValue.x}% ${modelValue.y}%` }"
        />
      </div>
    </div>
  </div>
</template>
