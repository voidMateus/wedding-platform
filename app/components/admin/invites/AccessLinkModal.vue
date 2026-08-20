<script setup lang="ts">
import QRCode from 'qrcode'

interface Props {
  modelValue: boolean
  inviteId: string
  weddingSlug: string | null | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Um novo link foi gerado — o pai registra na Linha do Tempo (refreshTimeline). */
  generated: []
}>()

const { getStatus, generate, revoke } = useGuestAccessTokens()

const isLoadingStatus = ref(false)
const isGenerating = ref(false)
const status = ref<{ active: boolean; id: string | null; createdAt: string | null } | null>(null)
const generatedLink = ref<string | null>(null)
const qrCodeDataUrl = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    errorMessage.value = null
    generatedLink.value = null
    qrCodeDataUrl.value = null
    isLoadingStatus.value = true
    try {
      status.value = await getStatus({ inviteId: props.inviteId })
    } catch {
      errorMessage.value = 'Não foi possível consultar o status do link.'
    } finally {
      isLoadingStatus.value = false
    }
  },
)

async function handleGenerate() {
  isGenerating.value = true
  errorMessage.value = null
  try {
    const result = await generate({ inviteId: props.inviteId })
    generatedLink.value = `${window.location.origin}/${props.weddingSlug}/rsvp/${result.code}`
    qrCodeDataUrl.value = await QRCode.toDataURL(generatedLink.value)
    status.value = { active: true, id: result.id, createdAt: result.createdAt }
    emit('generated')
  } catch {
    errorMessage.value = 'Não foi possível gerar o link. Tente novamente.'
  } finally {
    isGenerating.value = false
  }
}

async function handleRevoke() {
  if (!status.value?.id) return
  isGenerating.value = true
  try {
    await revoke(status.value.id)
    status.value = { active: false, id: null, createdAt: null }
    generatedLink.value = null
    qrCodeDataUrl.value = null
  } finally {
    isGenerating.value = false
  }
}

const toast = useToast()
async function copyLink() {
  if (!generatedLink.value) return
  await navigator.clipboard.writeText(generatedLink.value)
  toast.success('Link copiado.')
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Link de acesso"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <UiSkeleton v-if="isLoadingStatus" class="h-10 w-full" />
      <template v-else>
        <template v-if="generatedLink">
          <p class="text-sm text-text-muted">
            Copie agora — este link não pode ser recuperado depois de fechar esta janela.
          </p>
          <div class="flex items-center gap-2">
            <UiInput :model-value="generatedLink" class="flex-1" disabled />
            <UiButton type="button" size="sm" @click="copyLink">Copiar</UiButton>
          </div>
          <img
            v-if="qrCodeDataUrl"
            :src="qrCodeDataUrl"
            alt="QR Code do link de acesso"
            class="h-40 w-40"
          />
        </template>
        <p v-else-if="status?.active" class="text-sm text-text-muted">
          Link ativo. Por segurança, o código não pode ser exibido novamente — gere um novo link se
          precisar reenviar.
        </p>
        <p v-else class="text-sm text-text-muted">Nenhum link de acesso gerado ainda.</p>
        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      </template>
    </div>
    <template #footer>
      <UiButton
        v-if="status?.active"
        type="button"
        variant="destructive"
        :disabled="isGenerating"
        @click="handleRevoke"
      >
        Revogar
      </UiButton>
      <UiButton type="button" :disabled="isGenerating || isLoadingStatus" @click="handleGenerate">
        {{ status?.active ? 'Gerar novo link' : 'Gerar link' }}
      </UiButton>
    </template>
  </UiModal>
</template>
