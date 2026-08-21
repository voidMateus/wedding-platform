<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { RsvpInvitePayload, RsvpMember } from '~/types/rsvp'

interface Props {
  payload: RsvpInvitePayload
}

const props = defineProps<Props>()
// 'back' — volta para a etapa anterior do fluxo (busca), não para o site: só
// a etapa 'guests' (primeira deste componente) emite, o parent (rsvp/
// index.vue) decide o que "etapa anterior" significa ali.
const emit = defineEmits<{ back: [] }>()
const { autosaveGuestStatus, finalizeInvite } = useRsvp()
const toast = useToast()
const slug = useWeddingSlug()
const backToSiteLink = computed(() => `/${slug}`)

interface GuestState {
  guestId: string
  fullName: string
  status: 'pendente' | 'confirmado' | 'recusado'
  dietaryRestrictions: string
}

const guestStates = ref<GuestState[]>(
  props.payload.members.map((m) => ({
    guestId: m.guestId,
    fullName: m.fullName,
    status: m.status === 'lista_espera' || m.status === 'removido' ? 'pendente' : m.status,
    dietaryRestrictions: m.dietaryRestrictions ?? '',
  })),
)

const isPastDeadline = props.payload.isPastDeadline
const step = ref<'guests' | 'review' | 'success'>('guests')

async function setStatus(guest: GuestState, status: 'confirmado' | 'recusado') {
  if (isPastDeadline) return
  guest.status = status
  try {
    await autosaveGuestStatus(guest.guestId, {
      status,
      dietaryRestrictions: guest.dietaryRestrictions,
    })
  } catch {
    toast.error('Não foi possível salvar. Tente novamente.')
  }
}

const debouncedDietarySave = useDebounceFn((guest: GuestState) => {
  autosaveGuestStatus(guest.guestId, {
    status: 'confirmado',
    dietaryRestrictions: guest.dietaryRestrictions,
  }).catch(() => toast.error('Não foi possível salvar a restrição alimentar.'))
}, 600)

function onDietaryChange(guest: GuestState) {
  if (guest.status !== 'confirmado') return
  debouncedDietarySave(guest)
}

// --- acompanhante avulso (só modo_lista_convidados='aberta') ---

interface CompanionDraft {
  fullName: string
  dietaryRestrictions: string
}

const companions = ref<CompanionDraft[]>([])
const canAddCompanion = computed(
  () => props.payload.maxCompanions === null || companions.value.length < props.payload.maxCompanions,
)

function addCompanion() {
  if (!canAddCompanion.value) return
  companions.value.push({ fullName: '', dietaryRestrictions: '' })
}
function removeCompanion(index: number) {
  companions.value.splice(index, 1)
}

const message = ref(props.payload.message ?? '')

const allAnswered = computed(() => guestStates.value.every((g) => g.status !== 'pendente'))

const isSubmitting = ref(false)
async function handleFinalize() {
  isSubmitting.value = true
  try {
    await finalizeInvite(props.payload.inviteId, {
      companions: companions.value.filter((c) => c.fullName.trim()),
      message: message.value,
    })
    step.value = 'success'
  } catch {
    toast.error('Não foi possível enviar. Tente novamente.')
  } finally {
    isSubmitting.value = false
  }
}

function statusLabel(status: RsvpMember['status'] | GuestState['status']): string {
  if (status === 'confirmado') return 'Estará lá'
  if (status === 'recusado') return 'Não poderá ir'
  return 'Pendente'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <button
      v-if="step === 'guests'"
      type="button"
      class="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
      @click="emit('back')"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Voltar à busca
    </button>

    <p
      v-if="isPastDeadline"
      class="rounded-md border border-border bg-surface-muted p-4 text-sm text-text-muted"
    >
      O prazo para confirmar presença já encerrou. Sua última resposta registrada continua abaixo,
      mas não é mais possível alterá-la.
    </p>

    <template v-if="step === 'guests'">
      <div
        v-for="guest in guestStates"
        :key="guest.guestId"
        class="rounded-lg border border-border bg-surface-elevated p-5 shadow-sm"
      >
        <p class="mb-4 font-display text-lg font-semibold text-heading">{{ guest.fullName }}</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UiButton
            type="button"
            class="flex-1 whitespace-nowrap"
            rounded="full"
            :variant="guest.status === 'confirmado' ? 'primary' : 'outline'"
            :disabled="isPastDeadline"
            @click="setStatus(guest, 'confirmado')"
          >
            <Icon name="lucide:check" class="h-4 w-4" />
            Estarei lá
          </UiButton>
          <UiButton
            type="button"
            class="flex-1 whitespace-nowrap"
            rounded="full"
            variant="outline"
            :class="guest.status === 'recusado' ? '!border-text !bg-text !text-surface' : ''"
            :disabled="isPastDeadline"
            @click="setStatus(guest, 'recusado')"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
            Não poderei ir
          </UiButton>
        </div>

        <UiTextarea
          v-if="guest.status === 'confirmado'"
          v-model="guest.dietaryRestrictions"
          label="Restrição alimentar (opcional)"
          class="mt-4"
          :disabled="isPastDeadline"
          @update:model-value="onDietaryChange(guest)"
        />
      </div>

      <template v-if="payload.wedding.guestListMode === 'aberta'">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text">
            Acompanhantes ({{ companions.length }}<template v-if="payload.maxCompanions !== null">/{{ payload.maxCompanions }}</template>)
          </span>
          <UiButton type="button" size="sm" variant="ghost" :disabled="!canAddCompanion || isPastDeadline" @click="addCompanion">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar
          </UiButton>
        </div>
        <div
          v-for="(companion, index) in companions"
          :key="index"
          class="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated p-4"
        >
          <div class="flex items-start gap-2">
            <UiInput v-model="companion.fullName" class="flex-1" label="Nome" :disabled="isPastDeadline" />
            <UiButton
              type="button"
              size="sm"
              variant="ghost"
              class="mt-6"
              :disabled="isPastDeadline"
              @click="removeCompanion(index)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </UiButton>
          </div>
          <UiInput v-model="companion.dietaryRestrictions" label="Restrição alimentar (opcional)" :disabled="isPastDeadline" />
        </div>
      </template>

      <UiButton size="lg" :disabled="!allAnswered || isPastDeadline" @click="step = 'review'">
        Revisar e enviar
      </UiButton>
    </template>

    <template v-else-if="step === 'review'">
      <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated p-5">
        <div
          v-for="guest in guestStates"
          :key="guest.guestId"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="text-text">{{ guest.fullName }}</span>
          <UiBadge :tone="guest.status === 'confirmado' ? 'success' : 'danger'">
            {{ statusLabel(guest.status) }}
          </UiBadge>
        </div>
      </div>

      <UiTextarea v-model="message" label="Mensagem para o casal (opcional)" :disabled="isPastDeadline" />

      <div class="flex justify-between">
        <UiButton variant="ghost" @click="step = 'guests'">Voltar</UiButton>
        <UiButton :disabled="isSubmitting || isPastDeadline" @click="handleFinalize">
          Confirmar presença
        </UiButton>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-4 py-8 text-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="lucide:heart" class="h-6 w-6" />
        </span>
        <div>
          <p class="font-display text-xl font-semibold text-heading">Presença confirmada!</p>
          <p class="mt-1 text-text-muted">
            Obrigado por compartilhar este momento conosco. Sua confirmação foi registrada com
            sucesso.
          </p>
        </div>
        <div class="flex gap-3">
          <UiButton variant="outline" :disabled="isPastDeadline" @click="step = 'guests'">
            Alterar confirmação
          </UiButton>
          <UiButton :to="backToSiteLink">Voltar ao site</UiButton>
        </div>
      </div>
    </template>
  </div>
</template>
