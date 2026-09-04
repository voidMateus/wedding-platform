<script setup lang="ts">
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { GuestDetail } from '~/composables/useGuests'
import type { CompanionEntry } from './GuestPartyCompanionsStep.vue'
import type { InviteDraft } from './GuestPartyInviteStep.vue'

interface Props {
  initialGuest?: GuestDetail | null
  /**
   * Dentro de um modal o contêiner pai já é a moldura e a altura é limitada:
   * os passos perdem o cartão próprio e passam a rolar numa área interna, com
   * a régua de passos e os botões de navegação fixos fora dela.
   */
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), { initialGuest: null, embedded: false })

const { syncGuestParty } = useGuests()
const { listGroups } = useGroups()

const { data: groupsData, refresh: refreshGroups } = listGroups({ pageSize: 100 })
const groupOptions = computed(() => [
  ...(groupsData.value?.data.map((g) => ({ value: g.id, label: g.nome })) ?? []),
])

function emptyPerson(): GuestPersonInput {
  return {
    nomeCompleto: '',
    apelido: '',
    sexo: undefined,
    dataNascimento: '',
    papelCasamento: undefined,
    observacoes: '',
    grupoId: '',
  }
}

function personFromGuest(guest: GuestDetail | Record<string, unknown>): GuestPersonInput {
  const g = guest as Record<string, unknown>
  return {
    id: g.id as string,
    nomeCompleto: (g.nome_completo as string) ?? '',
    apelido: (g.apelido as string) ?? '',
    sexo: (g.sexo as GuestPersonInput['sexo']) ?? undefined,
    dataNascimento: (g.data_nascimento as string) ?? '',
    papelCasamento: (g.papel_casamento as GuestPersonInput['papelCasamento']) ?? undefined,
    observacoes: (g.observacoes as string) ?? '',
    grupoId: (g.grupo_id as string) ?? '',
  }
}

const isEditing = computed(() => Boolean(props.initialGuest))

const primary = ref<GuestPersonInput>(
  props.initialGuest ? personFromGuest(props.initialGuest) : emptyPerson(),
)

const companions = ref<CompanionEntry[]>(
  (props.initialGuest?.partyMembers ?? []).map((member) => ({
    key: member.id,
    person: personFromGuest(member),
  })),
)
const removedGuestIds = ref<string[]>([])

const hasExistingInvite = computed(() => Boolean(props.initialGuest?.invite))

// --- passos ---

const steps = computed(() => {
  const list: Array<{ id: string; label: string }> = [
    { id: 'dados', label: 'Dados do Convidado' },
    { id: 'acompanhantes', label: 'Acompanhantes' },
  ]
  if (showInviteStep.value) {
    list.push({ id: 'convite', label: 'Convite' })
  }
  list.push({ id: 'revisao', label: 'Revisão' })
  return list
})

const showInviteStep = computed(() => companions.value.length > 0 && !hasExistingInvite.value)

const currentStepIndex = ref(0)
const currentStepId = computed(() => steps.value[currentStepIndex.value]?.id)

// Volta ao topo a cada troca de step — em passos longos (ex.: Acompanhantes
// com vários itens), sem isso o usuário fica "preso" no meio do conteúdo
// depois de avançar. Embutido, quem rola é a área interna; na página, é a
// própria janela.
const wizardRoot = ref<HTMLElement | null>(null)
const stepsViewport = ref<HTMLElement | null>(null)
watch(currentStepIndex, () => {
  if (props.embedded) {
    stepsViewport.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  wizardRoot.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

const cardVariant = computed<'default' | 'plain'>(() => (props.embedded ? 'plain' : 'default'))
const cardPadding = computed<'none' | 'md'>(() => (props.embedded ? 'none' : 'md'))

const primaryNameError = ref<string | null>(null)

function goNext() {
  if (currentStepId.value === 'dados') {
    if (!primary.value.nomeCompleto.trim()) {
      primaryNameError.value = 'Informe o nome do convidado.'
      return
    }
    primaryNameError.value = null
  }
  if (currentStepIndex.value < steps.value.length - 1) currentStepIndex.value += 1
}
function goBack() {
  if (currentStepIndex.value > 0) currentStepIndex.value -= 1
}

function handleRemoveExisting(guestId: string) {
  removedGuestIds.value.push(guestId)
}

// --- convite ---

const inviteDraft = ref<InviteDraft>({ choice: 'create', name: '', notes: '' })

watch(
  () => primary.value.nomeCompleto,
  (name) => {
    if (!inviteDraft.value.name && name) {
      const firstName = name.trim().split(/\s+/)[0]
      inviteDraft.value = { ...inviteDraft.value, name: firstName ? `Família ${firstName}` : '' }
    }
  },
)

// --- concluir ---

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const emit = defineEmits<{ done: [result: { primaryGuestId: string; inviteId: string | null }] }>()

async function handleSubmit() {
  errorMessage.value = null
  isSubmitting.value = true
  try {
    const result = await syncGuestParty({
      primary: primary.value,
      companions: companions.value.map((c) => c.person),
      removedGuestIds: removedGuestIds.value,
      invite:
        showInviteStep.value && inviteDraft.value.choice === 'create'
          ? {
              nome: inviteDraft.value.name || 'Convite',
              observacoes: inviteDraft.value.notes,
            }
          : undefined,
    })
    emit('done', result)
  } catch (err) {
    const apiError = err as { data?: { message?: string } }
    errorMessage.value = apiError.data?.message ?? 'Não foi possível salvar. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    ref="wizardRoot"
    :class="embedded ? 'flex min-h-0 flex-1 flex-col gap-5' : 'flex flex-col gap-6'"
  >
    <ol class="flex shrink-0 items-center gap-2 text-sm">
      <template v-for="(step, index) in steps" :key="step.id">
        <li class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-brand"
            :class="
              index === currentStepIndex
                ? 'bg-primary text-primary-foreground'
                : index < currentStepIndex
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-muted text-text-muted'
            "
          >
            <Icon v-if="index < currentStepIndex" name="lucide:check" class="h-3.5 w-3.5" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span
            class="hidden transition-brand sm:inline"
            :class="index === currentStepIndex ? 'font-medium text-text' : 'text-text-muted'"
          >
            {{ step.label }}
          </span>
        </li>
        <li
          v-if="index < steps.length - 1"
          class="h-px flex-1 transition-brand"
          :class="index < currentStepIndex ? 'bg-primary/40' : 'bg-border'"
          aria-hidden="true"
        />
      </template>
    </ol>

    <div ref="stepsViewport" :class="embedded ? '-mx-6 min-h-0 flex-1 overflow-y-auto px-6' : ''">
      <Transition
        enter-active-class="transition-brand"
        enter-from-class="opacity-0 translate-x-2"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-brand"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-2"
        mode="out-in"
      >
        <!-- Passo: Dados do Convidado -->
        <UiCard
          v-if="currentStepId === 'dados'"
          key="dados"
          :variant="cardVariant"
          :padding="cardPadding"
        >
          <h2 class="mb-4 text-lg font-medium text-text">Dados do Convidado</h2>
          <AdminGuestsGuestPersonFields
            v-model="primary"
            :group-options="groupOptions"
            :full-name-error="primaryNameError"
            @group-created="() => refreshGroups()"
          />
        </UiCard>

        <!-- Passo: Acompanhantes -->
        <UiCard
          v-else-if="currentStepId === 'acompanhantes'"
          key="acompanhantes"
          :variant="cardVariant"
          :padding="cardPadding"
        >
          <AdminGuestsGuestPartyCompanionsStep
            v-model="companions"
            :group-options="groupOptions"
            :primary-id="primary.id"
            @group-created="() => refreshGroups()"
            @remove-existing="handleRemoveExisting"
          />
        </UiCard>

        <!-- Passo: Convite -->
        <UiCard
          v-else-if="currentStepId === 'convite'"
          key="convite"
          :variant="cardVariant"
          :padding="cardPadding"
        >
          <AdminGuestsGuestPartyInviteStep
            v-model="inviteDraft"
            :party-size="companions.length + 1"
          />
        </UiCard>

        <!-- Passo: Revisão -->
        <UiCard
          v-else-if="currentStepId === 'revisao'"
          key="revisao"
          :variant="cardVariant"
          :padding="cardPadding"
        >
          <h2 class="mb-4 text-lg font-medium text-text">Revisão</h2>
          <ul class="flex flex-col gap-2 text-sm">
            <li class="flex items-center gap-2">
              <Icon name="lucide:star" class="h-4 w-4 text-primary" />
              {{ primary.nomeCompleto }}
              <UiBadge tone="neutral">responsável</UiBadge>
            </li>
            <li v-for="entry in companions" :key="entry.key" class="flex items-center gap-2 pl-6">
              {{ entry.person.nomeCompleto }}
            </li>
          </ul>
          <p
            v-if="showInviteStep && inviteDraft.choice === 'create'"
            class="mt-4 text-sm text-text-muted"
          >
            Convite: <strong>{{ inviteDraft.name }}</strong>
          </p>
          <p v-if="errorMessage" class="mt-4 text-sm text-danger" role="alert">
            {{ errorMessage }}
          </p>
        </UiCard>
      </Transition>
    </div>

    <div
      class="flex shrink-0 justify-between"
      :class="embedded ? 'border-t border-border pt-4' : ''"
    >
      <UiButton variant="ghost" :disabled="currentStepIndex === 0" @click="goBack">Voltar</UiButton>
      <UiButton v-if="currentStepId !== 'revisao'" @click="goNext">Próximo</UiButton>
      <UiButton v-else :disabled="isSubmitting" @click="handleSubmit">
        {{ isEditing ? 'Salvar' : 'Concluir' }}
      </UiButton>
    </div>
  </div>
</template>
