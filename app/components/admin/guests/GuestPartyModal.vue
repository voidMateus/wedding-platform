<script setup lang="ts">
import type { GuestDetail } from '~/composables/useGuests'

interface Props {
  modelValue: boolean
  /** Ausente/null abre em cadastro; com id, carrega o convidado e abre em edição. */
  guestId?: string | null
}

const props = withDefaults(defineProps<Props>(), { guestId: null })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Convidado (com acompanhantes/convite) salvo — o pai recarrega a listagem e fecha. */
  saved: []
}>()

const { fetchGuestDetail } = useGuests()
const toast = useToast()

const guest = ref<GuestDetail | null>(null)
const isLoading = ref(false)
const hasLoadError = ref(false)

// O wizard lê `initialGuest` uma única vez, na montagem: a chave força uma
// instância nova a cada convidado aberto — sem ela, o segundo "Editar" da
// sessão mostraria os dados do primeiro.
const wizardKey = computed(() => props.guestId ?? 'novo')

async function loadGuest() {
  if (!props.guestId) {
    guest.value = null
    hasLoadError.value = false
    return
  }
  isLoading.value = true
  hasLoadError.value = false
  try {
    guest.value = await fetchGuestDetail(props.guestId)
  } catch {
    hasLoadError.value = true
  } finally {
    isLoading.value = false
  }
}

// Recarrega a cada abertura (e a cada troca de convidado com o modal aberto):
// o detalhe precisa refletir o que está no banco agora, não o de uma edição
// anterior desta mesma sessão.
watch(
  () => [props.modelValue, props.guestId] as const,
  ([isOpen]) => {
    if (isOpen) loadGuest()
  },
  { immediate: true },
)

function handleDone() {
  toast.success(props.guestId ? 'Convidado atualizado.' : 'Convidado cadastrado.')
  emit('saved')
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="guestId ? 'Editar convidado' : 'Novo convidado'"
    :description="
      guestId
        ? undefined
        : 'Cadastre o convidado e, se houver, os acompanhantes — tudo em um único fluxo.'
    "
    size="lg"
    scroll="content"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="isLoading" class="flex flex-col gap-3">
      <UiSkeleton class="h-7 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <UiEmptyState
      v-else-if="hasLoadError"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o convidado"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="loadGuest">Tentar novamente</UiButton>
    </UiEmptyState>

    <AdminGuestsGuestPartyWizard
      v-else
      :key="wizardKey"
      :initial-guest="guest"
      embedded
      @done="handleDone"
    />
  </UiModal>
</template>
