<script setup lang="ts">
import QRCode from 'qrcode'
import type { GuestAccessTokenStatus } from '~/types/guest-access-token'

interface Props {
  inviteId: string
  weddingSlug: string | null | undefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Um novo link foi gerado/revogado — o pai registra na Linha do Tempo. */
  changed: []
}>()

const { getStatus, generate, revoke } = useGuestAccessTokens()
const toast = useToast()

const isLoadingStatus = ref(false)
const isBusy = ref(false)
/** Ação destrutiva aguardando confirmação — as duas invalidam o link já enviado. */
const confirming = ref<'regenerate' | 'revoke' | null>(null)
const status = ref<GuestAccessTokenStatus | null>(null)
const code = ref<string | null>(null)
const qrCodeDataUrl = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const origin = useRequestURL().origin

const link = computed(() =>
  code.value ? `${origin}/${props.weddingSlug}/rsvp/${code.value}` : null,
)

/** Link ativo criado antes de `codigo_cifrado` existir: válido, mas não reexibível. */
const isActiveWithoutCode = computed(() => Boolean(status.value?.active) && !code.value)

watch(
  link,
  async (value) => {
    qrCodeDataUrl.value = value ? await QRCode.toDataURL(value) : null
  },
  { immediate: true },
)

// Monta junto com o modal (o conteúdo do dialog é desmontado ao fechar), então
// o status é sempre o do convite que está aberto agora.
onMounted(async () => {
  isLoadingStatus.value = true
  try {
    status.value = await getStatus({ conviteId: props.inviteId })
    code.value = status.value.code
  } catch {
    errorMessage.value = 'Não foi possível consultar o status do link.'
  } finally {
    isLoadingStatus.value = false
  }
})

async function handleGenerate() {
  isBusy.value = true
  errorMessage.value = null
  try {
    const result = await generate({ conviteId: props.inviteId })
    status.value = {
      active: true,
      id: result.id,
      createdAt: result.createdAt,
      code: result.code,
    }
    code.value = result.code
    confirming.value = null
    emit('changed')
  } catch {
    errorMessage.value = 'Não foi possível gerar o link. Tente novamente.'
  } finally {
    isBusy.value = false
  }
}

async function handleRevoke() {
  if (!status.value?.id) return
  isBusy.value = true
  try {
    await revoke(status.value.id)
    status.value = { active: false, id: null, createdAt: null, code: null }
    code.value = null
    confirming.value = null
    emit('changed')
  } finally {
    isBusy.value = false
  }
}

async function copyLink() {
  if (!link.value) return
  await navigator.clipboard.writeText(link.value)
  toast.success('Link copiado.')
}
</script>

<template>
  <AdminInvitesInviteSection title="Link de acesso">
    <template #actions>
      <UiButton
        v-if="status?.active"
        size="sm"
        variant="ghost"
        :disabled="isBusy"
        @click="confirming = 'revoke'"
      >
        Revogar
      </UiButton>
      <UiButton
        size="sm"
        variant="ghost"
        :disabled="isBusy || isLoadingStatus"
        @click="status?.active ? (confirming = 'regenerate') : handleGenerate()"
      >
        {{ status?.active ? 'Gerar novo link' : 'Gerar link' }}
      </UiButton>
    </template>

    <UiSkeleton v-if="isLoadingStatus" class="h-10 w-full" />

    <div v-else class="flex flex-col gap-3">
      <div
        v-if="confirming"
        class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2"
      >
        <p class="text-sm text-text">
          <template v-if="confirming === 'regenerate'">
            Gerar um novo link? O link e o QR code atuais param de funcionar na hora — inclusive se
            já foram enviados ao convidado ou impressos no convite. Para apenas reenviar, cancele e
            copie o link atual.
          </template>
          <template v-else>
            Revogar o link deste convite? Ele e o QR code param de funcionar na hora, inclusive se
            já foram enviados ou impressos.
          </template>
        </p>
        <div class="flex shrink-0 items-center gap-2">
          <UiButton size="sm" variant="ghost" :disabled="isBusy" @click="confirming = null">
            Cancelar
          </UiButton>
          <UiButton
            size="sm"
            variant="destructive"
            :disabled="isBusy"
            @click="confirming === 'regenerate' ? handleGenerate() : handleRevoke()"
          >
            {{ confirming === 'regenerate' ? 'Gerar novo link' : 'Revogar' }}
          </UiButton>
        </div>
      </div>

      <template v-if="link">
        <p class="text-sm text-text-muted">
          Este é o link do convite. Ele continua o mesmo, então você pode voltar aqui e reenviar
          quantas vezes precisar.
        </p>
        <div class="flex items-center gap-2">
          <UiInput :model-value="link" class="flex-1" disabled />
          <UiButton type="button" size="sm" @click="copyLink">Copiar</UiButton>
        </div>
        <img
          v-if="qrCodeDataUrl"
          :src="qrCodeDataUrl"
          alt="QR Code do link de acesso"
          class="h-40 w-40"
        />
      </template>

      <p v-else-if="isActiveWithoutCode" class="text-sm text-text-muted">
        Link ativo, mas gerado antes de o painel passar a guardar o código para reexibição. Ele
        continua funcionando para o convidado; só não é possível vê-lo aqui. Para reenviar, gere um
        novo link — o anterior deixa de funcionar.
      </p>
      <p v-else class="text-sm text-text-muted">Nenhum link de acesso gerado ainda.</p>

      <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>
    </div>
  </AdminInvitesInviteSection>
</template>
