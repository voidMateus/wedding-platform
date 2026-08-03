<script setup lang="ts">
import type { RsvpInvitePayload, RsvpMember } from '~/types/rsvp'

interface Props {
  payload: RsvpInvitePayload
}

const props = defineProps<Props>()
const { autosaveGuestStatus, finalizeInvite } = useRsvp()
const toast = useToast()

interface GuestState {
  guestId: string
  fullName: string
  status: 'pending' | 'confirmed' | 'declined'
  dietaryRestrictions: string
}

const guestStates = ref<GuestState[]>(
  props.payload.members.map((m) => ({
    guestId: m.guestId,
    fullName: m.fullName,
    status: m.status === 'waitlisted' || m.status === 'removed' ? 'pending' : m.status,
    dietaryRestrictions: m.dietaryRestrictions ?? '',
  })),
)

const isPastDeadline = props.payload.isPastDeadline
const step = ref<'guests' | 'review' | 'success'>('guests')

async function setStatus(guest: GuestState, status: 'confirmed' | 'declined') {
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

let dietaryTimeout: ReturnType<typeof setTimeout> | undefined
function onDietaryChange(guest: GuestState) {
  if (guest.status !== 'confirmed') return
  clearTimeout(dietaryTimeout)
  dietaryTimeout = setTimeout(() => {
    autosaveGuestStatus(guest.guestId, {
      status: 'confirmed',
      dietaryRestrictions: guest.dietaryRestrictions,
    }).catch(() => toast.error('Não foi possível salvar a restrição alimentar.'))
  }, 600)
}

// --- acompanhante avulso (só guest_list_mode='open') ---

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

const allAnswered = computed(() => guestStates.value.every((g) => g.status !== 'pending'))

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
  if (status === 'confirmed') return 'Estará lá'
  if (status === 'declined') return 'Não poderá ir'
  return 'Pendente'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <p
      v-if="isPastDeadline"
      class="rounded-md border border-border bg-surface-muted p-4 text-sm text-text-muted"
    >
      O prazo para confirmar presença já encerrou. Sua última resposta registrada continua abaixo,
      mas não é mais possível alterá-la.
    </p>

    <template v-if="step === 'guests'">
      <div v-for="guest in guestStates" :key="guest.guestId" class="rounded-lg border border-border p-4">
        <p class="mb-3 font-medium text-text">{{ guest.fullName }}</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium"
            :class="
              guest.status === 'confirmed'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-text'
            "
            :disabled="isPastDeadline"
            @click="setStatus(guest, 'confirmed')"
          >
            Estarei lá
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium"
            :class="
              guest.status === 'declined'
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-text'
            "
            :disabled="isPastDeadline"
            @click="setStatus(guest, 'declined')"
          >
            Não poderei ir
          </button>
        </div>

        <UiTextarea
          v-if="guest.status === 'confirmed'"
          v-model="guest.dietaryRestrictions"
          label="Restrição alimentar (opcional)"
          class="mt-3"
          :disabled="isPastDeadline"
          @update:model-value="onDietaryChange(guest)"
        />
      </div>

      <template v-if="payload.wedding.guestListMode === 'open'">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text">
            Acompanhantes ({{ companions.length }}<template v-if="payload.maxCompanions !== null">/{{ payload.maxCompanions }}</template>)
          </span>
          <UiButton type="button" size="sm" variant="ghost" :disabled="!canAddCompanion || isPastDeadline" @click="addCompanion">
            Adicionar acompanhante
          </UiButton>
        </div>
        <div
          v-for="(companion, index) in companions"
          :key="index"
          class="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div class="flex items-start gap-2">
            <UiInput v-model="companion.fullName" class="flex-1" label="Nome" :disabled="isPastDeadline" />
            <UiButton type="button" size="sm" variant="ghost" class="mt-6" :disabled="isPastDeadline" @click="removeCompanion(index)">
              Remover
            </UiButton>
          </div>
          <UiInput v-model="companion.dietaryRestrictions" label="Restrição alimentar (opcional)" :disabled="isPastDeadline" />
        </div>
      </template>

      <UiButton :disabled="!allAnswered || isPastDeadline" @click="step = 'review'">
        Revisar e enviar
      </UiButton>
    </template>

    <template v-else-if="step === 'review'">
      <ul class="flex flex-col gap-2">
        <li v-for="guest in guestStates" :key="guest.guestId" class="flex items-center gap-2 text-sm">
          <Icon :name="guest.status === 'confirmed' ? 'lucide:check' : 'lucide:x'" class="h-4 w-4" />
          {{ guest.fullName }} — {{ statusLabel(guest.status) }}
        </li>
      </ul>

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
        <p class="text-2xl">❤️ Presença confirmada!</p>
        <p class="text-text-muted">
          Obrigado por compartilhar este momento conosco. Sua confirmação foi registrada com
          sucesso.
        </p>
        <div class="flex gap-2">
          <UiButton variant="outline" :disabled="isPastDeadline" @click="step = 'guests'">
            Alterar confirmação
          </UiButton>
          <UiButton to="/">Voltar ao site</UiButton>
        </div>
      </div>
    </template>
  </div>
</template>
