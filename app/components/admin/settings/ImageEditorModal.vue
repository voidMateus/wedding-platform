<!--
  Editor de foto em modal: cortar, girar e enquadrar antes de salvar.

  Substitui o seletor de ponto de foco que ficava sempre aberto no cartão e
  persistia a cada arraste — cada micro-ajuste virava uma requisição e um
  recarregamento do casamento, então a tela "piscava" enquanto a pessoa
  tentava enquadrar. Aqui nada sai daqui até "Aplicar": o editor trabalha em
  memória e o servidor é chamado uma única vez.

  O quadro de corte tem proporção travada por uso (16:9 na capa, 4:5 na
  história) porque o site desenha essas fotos em contêineres de proporção
  fixa: deixar o corte livre só empurraria o problema de enquadramento para
  o site público.

  Exporta o recorte como JPEG de qualidade 0.92 — o resultado passa a ser a
  foto salva, então o formato precisa ser um que o endpoint de upload aceite
  (allowlist de MIME em CLAUDE.md, seção 11) e que não infle o arquivo como
  o PNG faria numa fotografia.
-->
<script setup lang="ts">
import { Cropper, RectangleStencil } from 'vue-advanced-cropper'

interface Props {
  open: boolean
  /** URL da foto atual — o editor sempre parte da imagem já salva. */
  src: string | null
  /** Proporção do quadro de corte (16/9 na capa, 4/5 na história). */
  aspectRatio: number
  title: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** Recorte confirmado, pronto para subir. */
  confirm: [file: File]
}>()

const JPEG_QUALITY = 0.92
/** Teto do lado maior do recorte — acima disso o ganho visual não paga o peso. */
const MAX_OUTPUT_WIDTH = 2400

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)

function rotate(degrees: number) {
  cropperRef.value?.rotate(degrees)
}

function reset() {
  errorMessage.value = null
  cropperRef.value?.reset()
}

function close() {
  emit('update:open', false)
}

async function apply() {
  const cropper = cropperRef.value
  if (!cropper) return

  errorMessage.value = null
  isProcessing.value = true
  try {
    // O teto de tamanho vem do prop `canvas` do componente, não daqui:
    // nesta versão `getResult()` não recebe argumentos.
    const { canvas } = cropper.getResult() as { canvas?: HTMLCanvasElement }

    if (!canvas) {
      errorMessage.value = 'Não foi possível gerar o recorte. Tente novamente.'
      return
    }

    // toBlob lança SecurityError se a imagem tiver "contaminado" o canvas —
    // o que acontece quando ela vem de outra origem sem cabeçalho CORS. Vale
    // uma mensagem clara em vez de um erro cru: a saída para o casal é
    // reenviar a foto, que passa a ser servida com os cabeçalhos certos.
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob((value) => resolve(value), 'image/jpeg', JPEG_QUALITY)
      } catch {
        resolve(null)
      }
    })

    if (!blob) {
      errorMessage.value =
        'Não foi possível processar esta foto aqui. Envie a imagem novamente e tente editar.'
      return
    }

    emit('confirm', new File([blob], 'foto.jpg', { type: 'image/jpeg' }))
    close()
  } finally {
    isProcessing.value = false
  }
}

// Recomeça limpo a cada abertura: sem isto, o editor reabriria com a rotação
// e o quadro da sessão anterior, que já não correspondem à foto salva.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    errorMessage.value = null
    nextTick(() => cropperRef.value?.reset())
  },
)
</script>

<template>
  <UiModal
    :model-value="open"
    :title="title"
    size="lg"
    @update:model-value="(value) => emit('update:open', value)"
  >
    <div class="flex flex-col gap-3">
      <p class="text-sm text-text-muted">
        Arraste para reposicionar, use as alças para ajustar o corte e a roda do mouse para
        aproximar. Nada é salvo até você aplicar.
      </p>

      <div class="overflow-hidden rounded-md border border-border bg-text/5">
        <Cropper
          v-if="src"
          ref="cropperRef"
          class="h-[22rem] w-full"
          :src="src"
          :stencil-component="RectangleStencil"
          :stencil-props="{ aspectRatio }"
          :canvas="{ maxWidth: MAX_OUTPUT_WIDTH }"
          :transitions="false"
          image-restriction="fit-area"
          cross-origin="anonymous"
          check-orientation
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UiButton type="button" size="sm" variant="ghost" @click="rotate(-90)">
          <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
          Girar à esquerda
        </UiButton>
        <UiButton type="button" size="sm" variant="ghost" @click="rotate(90)">
          <Icon name="lucide:rotate-cw" class="h-4 w-4" />
          Girar à direita
        </UiButton>
        <UiButton type="button" size="sm" variant="ghost" @click="reset">
          <Icon name="lucide:undo-2" class="h-4 w-4" />
          Recomeçar
        </UiButton>
      </div>

      <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>
    </div>

    <template #footer>
      <UiButton variant="ghost" :disabled="isProcessing" @click="close">Cancelar</UiButton>
      <UiButton :disabled="isProcessing || !src" @click="apply">
        {{ isProcessing ? 'Aplicando...' : 'Aplicar e salvar' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style>
/* Estilos base do cropper (alças, linhas do quadro). Importado aqui, e não no
   `css` do nuxt.config, para só entrar no bundle de quem abre o editor. */
@import 'vue-advanced-cropper/dist/style.css';
</style>
