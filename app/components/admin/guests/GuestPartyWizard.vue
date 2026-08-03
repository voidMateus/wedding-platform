<script setup lang="ts">
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { GuestDetail } from '~/composables/useGuests'

interface Props {
  initialGuest?: GuestDetail | null
}

const props = withDefaults(defineProps<Props>(), { initialGuest: null })

const { syncGuestParty } = useGuests()
const { listGroups } = useGroups()
const { listInviteTags, createInviteTag } = useInviteTags()

const { data: groupsData } = listGroups({ pageSize: 100 })
const groupOptions = computed(() => [
  ...(groupsData.value?.data.map((g) => ({ value: g.id, label: g.name })) ?? []),
])

const { data: tagsData, refresh: refreshTags } = listInviteTags()

function emptyPerson(): GuestPersonInput {
  return {
    fullName: '',
    nickname: '',
    sex: undefined,
    birthDate: '',
    weddingRole: undefined,
    dietaryRestrictions: '',
    notes: '',
    groupId: '',
  }
}

function personFromGuest(guest: GuestDetail | Record<string, unknown>): GuestPersonInput {
  const g = guest as Record<string, unknown>
  return {
    id: g.id as string,
    fullName: (g.full_name as string) ?? '',
    nickname: (g.nickname as string) ?? '',
    sex: (g.sex as GuestPersonInput['sex']) ?? undefined,
    birthDate: (g.birth_date as string) ?? '',
    weddingRole: (g.wedding_role as GuestPersonInput['weddingRole']) ?? undefined,
    dietaryRestrictions: (g.dietary_restrictions as string) ?? '',
    notes: (g.notes as string) ?? '',
    groupId: (g.group_id as string) ?? '',
  }
}

const isEditing = computed(() => Boolean(props.initialGuest))

const primary = ref<GuestPersonInput>(
  props.initialGuest ? personFromGuest(props.initialGuest) : emptyPerson(),
)

interface CompanionEntry {
  key: string
  person: GuestPersonInput
}

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

function goNext() {
  if (currentStepIndex.value < steps.value.length - 1) currentStepIndex.value += 1
}
function goBack() {
  if (currentStepIndex.value > 0) currentStepIndex.value -= 1
}

// --- acompanhantes ---

const isAddingCompanion = ref(false)
const companionDraft = ref<GuestPersonInput>(emptyPerson())
const editingCompanionKey = ref<string | null>(null)

function startAddCompanion() {
  companionDraft.value = emptyPerson()
  editingCompanionKey.value = null
  isAddingCompanion.value = true
}

function startEditCompanion(entry: CompanionEntry) {
  companionDraft.value = { ...entry.person }
  editingCompanionKey.value = entry.key
  isAddingCompanion.value = true
}

function confirmCompanion() {
  if (!companionDraft.value.fullName.trim()) return

  if (editingCompanionKey.value) {
    const target = companions.value.find((c) => c.key === editingCompanionKey.value)
    if (target) target.person = { ...companionDraft.value }
  } else {
    companions.value.push({
      key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      person: { ...companionDraft.value },
    })
  }

  isAddingCompanion.value = false
  editingCompanionKey.value = null
}

function removeCompanion(entry: CompanionEntry) {
  if (entry.person.id) {
    removedGuestIds.value.push(entry.person.id)
  }
  companions.value = companions.value.filter((c) => c.key !== entry.key)
}

function moveCompanion(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= companions.value.length) return
  const list = [...companions.value]
  const temp = list[index]!
  list[index] = list[target]!
  list[target] = temp
  companions.value = list
}

// --- convite ---

const createInviteChoice = ref<'create' | 'later'>('create')
const inviteName = ref('')
const inviteNotes = ref('')
const selectedTagIds = ref<string[]>([])
const newTagName = ref('')

watch(
  () => primary.value.fullName,
  (name) => {
    if (!inviteName.value && name) {
      const firstName = name.trim().split(/\s+/)[0]
      inviteName.value = firstName ? `Família ${firstName}` : ''
    }
  },
)

function toggleTag(tagId: string) {
  selectedTagIds.value = selectedTagIds.value.includes(tagId)
    ? selectedTagIds.value.filter((id) => id !== tagId)
    : [...selectedTagIds.value, tagId]
}

async function addNewTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await createInviteTag({ name })
    await refreshTags()
    selectedTagIds.value.push(tag.id)
    newTagName.value = ''
  } catch {
    // etiqueta duplicada ou inválida — silenciosamente ignorado, usuário pode tentar de novo
  }
}

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
        showInviteStep.value && createInviteChoice.value === 'create'
          ? {
              name: inviteName.value || 'Convite',
              notes: inviteNotes.value,
              tagIds: selectedTagIds.value,
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
  <div class="flex flex-col gap-6">
    <ol class="flex flex-wrap gap-2 text-sm">
      <li
        v-for="(step, index) in steps"
        :key="step.id"
        class="rounded-full px-3 py-1"
        :class="
          index === currentStepIndex
            ? 'bg-primary text-primary-foreground'
            : index < currentStepIndex
              ? 'bg-surface-muted text-text'
              : 'bg-surface-muted text-text-muted'
        "
      >
        {{ index + 1 }}. {{ step.label }}
      </li>
    </ol>

    <!-- Passo: Dados do Convidado -->
    <UiCard v-if="currentStepId === 'dados'">
      <h2 class="mb-4 text-lg font-medium text-text">Dados do Convidado</h2>
      <AdminGuestsGuestPersonFields v-model="primary" :group-options="groupOptions" />
    </UiCard>

    <!-- Passo: Acompanhantes -->
    <UiCard v-else-if="currentStepId === 'acompanhantes'">
      <h2 class="mb-1 text-lg font-medium text-text">Acompanhantes</h2>
      <p class="mb-4 text-sm text-text-muted">
        Casal, pais e filhos, mesma residência, amigos inseparáveis — qualquer conjunto que
        normalmente é convidado junto.
      </p>

      <p v-if="!companions.length" class="text-sm text-text-muted">
        Nenhum acompanhante cadastrado.
      </p>

      <ul v-else class="mb-4 flex flex-col gap-2">
        <li
          v-for="(entry, index) in companions"
          :key="entry.key"
          class="flex items-center justify-between rounded-md border border-border px-3 py-2"
        >
          <span class="text-sm text-text">{{ entry.person.fullName }}</span>
          <div class="flex items-center gap-1">
            <UiButton size="sm" variant="ghost" :disabled="index === 0" @click="moveCompanion(index, -1)">
              <Icon name="lucide:chevron-up" class="h-4 w-4" />
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :disabled="index === companions.length - 1"
              @click="moveCompanion(index, 1)"
            >
              <Icon name="lucide:chevron-down" class="h-4 w-4" />
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="startEditCompanion(entry)">Editar</UiButton>
            <UiButton size="sm" variant="destructive" @click="removeCompanion(entry)">Remover</UiButton>
          </div>
        </li>
      </ul>

      <div v-if="isAddingCompanion" class="mb-4 rounded-md border border-border p-4">
        <AdminGuestsGuestPersonFields v-model="companionDraft" :group-options="groupOptions" />
        <div class="mt-4 flex justify-end gap-2">
          <UiButton variant="ghost" @click="isAddingCompanion = false">Cancelar</UiButton>
          <UiButton @click="confirmCompanion">Confirmar</UiButton>
        </div>
      </div>

      <UiButton v-else variant="outline" @click="startAddCompanion">+ Adicionar acompanhante</UiButton>
    </UiCard>

    <!-- Passo: Convite -->
    <UiCard v-else-if="currentStepId === 'convite'">
      <h2 class="mb-1 text-lg font-medium text-text">Convite</h2>
      <p class="mb-4 text-sm text-text-muted">
        Este grupo possui {{ companions.length + 1 }} pessoas. Deseja criar um convite para elas
        agora?
      </p>

      <UiRadioGroup
        v-model="createInviteChoice"
        :options="[
          { value: 'create', label: 'Criar convite agora' },
          { value: 'later', label: 'Fazer depois' },
        ]"
      />

      <div v-if="createInviteChoice === 'create'" class="mt-4 flex flex-col gap-4">
        <UiInput v-model="inviteName" label="Nome do convite" />
        <UiTextarea v-model="inviteNotes" label="Observações internas (opcional)" />

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-text">Etiquetas (opcional)</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in tagsData?.data ?? []"
              :key="tag.id"
              type="button"
              class="rounded-full border px-3 py-1 text-xs"
              :class="
                selectedTagIds.includes(tag.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-text-muted'
              "
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <UiInput v-model="newTagName" placeholder="Nova etiqueta" class="max-w-xs" />
            <UiButton size="sm" variant="ghost" @click="addNewTag">Adicionar</UiButton>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Passo: Revisão -->
    <UiCard v-else-if="currentStepId === 'revisao'">
      <h2 class="mb-4 text-lg font-medium text-text">Revisão</h2>
      <ul class="flex flex-col gap-2 text-sm">
        <li class="flex items-center gap-2">
          <Icon name="lucide:star" class="h-4 w-4 text-amber-500" />
          {{ primary.fullName }}
          <UiBadge tone="neutral">responsável</UiBadge>
        </li>
        <li v-for="entry in companions" :key="entry.key" class="flex items-center gap-2 pl-6">
          {{ entry.person.fullName }}
        </li>
      </ul>
      <p v-if="showInviteStep && createInviteChoice === 'create'" class="mt-4 text-sm text-text-muted">
        Convite: <strong>{{ inviteName }}</strong>
      </p>
      <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">{{ errorMessage }}</p>
    </UiCard>

    <div class="flex justify-between">
      <UiButton variant="ghost" :disabled="currentStepIndex === 0" @click="goBack">Voltar</UiButton>
      <UiButton v-if="currentStepId !== 'revisao'" @click="goNext">Próximo</UiButton>
      <UiButton v-else :disabled="isSubmitting" @click="handleSubmit">
        {{ isEditing ? 'Salvar' : 'Concluir' }}
      </UiButton>
    </div>
  </div>
</template>
