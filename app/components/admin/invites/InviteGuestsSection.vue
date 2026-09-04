<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import type { InviteDetail } from '~/types/invite'

// Rótulo e cor de cada status saem do mapa único
// (app/utils/status-presentation.ts).

interface Props {
  invite: InviteDetail
  /** Slug ativo — o "Editar" de um membro abre o modal de convidado na listagem de Convidados. */
  weddingSlug: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Membro adicionado/removido ou responsável trocado — o pai recarrega o detalhe. */
  changed: []
}>()

const { updateInvite, addGuestsToInvite, removeGuestFromInvite } = useInvites()
const { listGuests, fetchGuestDetail } = useGuests()
const toast = useToast()

const isBusy = ref(false)

// Filtro por status. Só aparece quando há mais de um status entre os membros —
// num convite em que todos estão pendentes ele não recortaria nada, e a barra
// de chips viraria enfeite.
const statusFilter = ref('todos')

const presentStatuses = computed(
  () => new Set(props.invite.members.map((member) => member.rsvpStatus)),
)

const showStatusFilter = computed(() => presentStatuses.value.size > 1)

const statusChips = computed(() => [
  { value: 'todos', label: 'Todos' },
  ...(['confirmado', 'pendente', 'recusado', 'lista_espera', 'removido'] as const)
    .filter((status) => presentStatuses.value.has(status))
    .map((status) => ({ value: status, label: rsvpStatusPresentation(status).label })),
])

const visibleMembers = computed(() =>
  statusFilter.value === 'todos'
    ? props.invite.members
    : props.invite.members.filter((member) => member.rsvpStatus === statusFilter.value),
)

// PATCH /api/invites/:id é sobrescrita total: os campos que este bloco não
// edita (nome, observações, max_acompanhantes) precisam ser reenviados como
// estão, ou trocar o responsável apagaria todos eles. tagIds fica fora de
// propósito — é opcional no schema, e omitir preserva os vínculos existentes.
async function makeResponsible(guestId: string) {
  isBusy.value = true
  try {
    await updateInvite(props.invite.id, {
      nome: props.invite.nome,
      observacoes: props.invite.observacoes ?? '',
      convidadoResponsavelId: guestId,
      maxAcompanhantes: props.invite.max_acompanhantes ?? undefined,
    })
    toast.success('Responsável atualizado.')
    emit('changed')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível atualizar o responsável.'))
  } finally {
    isBusy.value = false
  }
}

async function removeGuest(guestId: string) {
  isBusy.value = true
  try {
    await removeGuestFromInvite(props.invite.id, guestId)
    emit('changed')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível remover o convidado.'))
  } finally {
    isBusy.value = false
  }
}

// --- adicionar convidado (inline, não um segundo modal) ---

const isAdding = ref(false)
const guestSearch = ref('')
const selectedCandidateId = ref<string | null>(null)
const suggestedSiblings = ref<Array<{ id: string; nome_completo: string }>>([])
const checkedSiblingIds = ref<Set<string>>(new Set())

const { data: candidatesData } = listGuests(
  computed(() => ({
    unassigned: true,
    search: guestSearch.value.trim() || undefined,
    pageSize: 10,
  })),
)

function startAdding() {
  guestSearch.value = ''
  selectedCandidateId.value = null
  suggestedSiblings.value = []
  checkedSiblingIds.value = new Set()
  isAdding.value = true
}

async function selectCandidate(id: string) {
  selectedCandidateId.value = id
  const detail = await fetchGuestDetail(id)
  suggestedSiblings.value = detail.partyMembers ?? []
  checkedSiblingIds.value = new Set(suggestedSiblings.value.map((sibling) => sibling.id))
}

async function confirmAdd() {
  if (!selectedCandidateId.value) return
  isBusy.value = true
  try {
    await addGuestsToInvite(props.invite.id, [
      selectedCandidateId.value,
      ...checkedSiblingIds.value,
    ])
    isAdding.value = false
    emit('changed')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível adicionar o convidado.'))
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <AdminInvitesInviteSection
    title="Convidados"
    :meta="`${invite.members.length} ${invite.members.length === 1 ? 'pessoa' : 'pessoas'}`"
  >
    <template #actions>
      <AdminFilterChips
        v-if="showStatusFilter"
        v-model="statusFilter"
        :items="statusChips"
        group-label="Filtrar convidados do convite por status de RSVP"
      />
      <UiButton v-if="!isAdding" size="sm" variant="ghost" @click="startAdding">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar convidado
      </UiButton>
    </template>

    <p v-if="!invite.members.length && !isAdding" class="text-sm text-text-muted">
      Nenhum convidado vinculado a este convite ainda.
    </p>

    <p v-else-if="!visibleMembers.length" class="text-sm text-text-muted">
      Nenhum convidado com esse status neste convite.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="member in visibleMembers"
        :key="member.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
      >
        <span class="inline-flex min-w-0 items-center gap-2 text-sm text-text">
          <Icon
            :name="member.isResponsible ? 'lucide:star' : 'lucide:circle'"
            class="h-4 w-4 shrink-0"
            :class="member.isResponsible ? 'text-primary' : 'text-text-muted'"
          />
          <span class="truncate">{{ member.fullName }}</span>
          <span v-if="member.isResponsible" class="shrink-0 text-xs text-text-muted">
            (Responsável)
          </span>
          <UiBadge :tone="rsvpStatusPresentation(member.rsvpStatus).tone">
            {{ rsvpStatusPresentation(member.rsvpStatus).label }}
          </UiBadge>
        </span>
        <span class="inline-flex shrink-0 items-center gap-1">
          <UiButton
            v-if="!member.isResponsible"
            size="sm"
            variant="ghost"
            :disabled="isBusy"
            @click="makeResponsible(member.id)"
          >
            Tornar responsável
          </UiButton>
          <AdminRowAction
            icon="lucide:pencil"
            :label="`Editar ${member.fullName}`"
            :to="`/admin/${weddingSlug}/convidados?editar=${member.id}`"
          />
          <AdminRowAction
            icon="lucide:user-minus"
            tone="danger"
            :label="`Remover ${member.fullName} do convite`"
            @click="removeGuest(member.id)"
          />
        </span>
      </li>
    </ul>

    <div v-if="isAdding" class="flex flex-col gap-3 rounded-md border border-border p-3">
      <UiInput
        v-model="guestSearch"
        icon="lucide:search"
        tone="muted"
        placeholder="Buscar convidado sem convite"
      />

      <ul class="flex max-h-40 flex-col gap-1 overflow-y-auto">
        <li v-for="candidate in candidatesData?.data ?? []" :key="candidate.id">
          <button
            type="button"
            class="w-full rounded-md border px-3 py-2 text-left text-sm transition-brand"
            :class="
              selectedCandidateId === candidate.id
                ? 'border-primary bg-surface-muted'
                : 'border-border hover:bg-surface-muted'
            "
            @click="selectCandidate(candidate.id)"
          >
            {{ candidate.nome_completo }}
          </button>
        </li>
        <li v-if="!candidatesData?.data.length" class="px-1 py-2 text-sm text-text-muted">
          Nenhum convidado sem convite com esse nome.
        </li>
      </ul>

      <div v-if="suggestedSiblings.length" class="rounded-md border border-border p-3">
        <p class="mb-2 text-sm text-text">
          Encontramos {{ suggestedSiblings.length }} acompanhante(s) vinculado(s) — adicionar
          também?
        </p>
        <UiCheckbox
          v-for="sibling in suggestedSiblings"
          :key="sibling.id"
          :model-value="checkedSiblingIds.has(sibling.id)"
          :label="sibling.nome_completo"
          @update:model-value="
            (checked) =>
              checked ? checkedSiblingIds.add(sibling.id) : checkedSiblingIds.delete(sibling.id)
          "
        />
      </div>

      <div class="flex justify-end gap-2">
        <UiButton size="sm" variant="ghost" @click="isAdding = false"> Cancelar </UiButton>
        <UiButton size="sm" :disabled="!selectedCandidateId || isBusy" @click="confirmAdd">
          Adicionar
        </UiButton>
      </div>
    </div>
  </AdminInvitesInviteSection>
</template>
