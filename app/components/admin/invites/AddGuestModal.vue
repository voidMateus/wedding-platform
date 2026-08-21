<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

interface Props {
  modelValue: boolean
  inviteId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Convidado(s) adicionados — o pai atualiza a lista de membros e a Linha do Tempo. */
  added: []
}>()

const { addGuestsToInvite } = useInvites()
const { listGuests, fetchGuestDetail } = useGuests()
const toast = useToast()

const guestSearch = ref('')
const { data: candidatesData } = listGuests(
  computed(() => ({
    unassigned: true,
    search: guestSearch.value.trim() || undefined,
    pageSize: 10,
  })),
)

const selectedCandidateId = ref<string | null>(null)
const suggestedSiblings = ref<Array<{ id: string; full_name: string }>>([])
const checkedSiblingIds = ref<Set<string>>(new Set())

async function selectCandidate(id: string) {
  selectedCandidateId.value = id
  const detail = await fetchGuestDetail(id)
  suggestedSiblings.value = detail.partyMembers ?? []
  checkedSiblingIds.value = new Set(suggestedSiblings.value.map((s) => s.id))
}

async function confirm() {
  if (!selectedCandidateId.value) return
  const guestIds = [selectedCandidateId.value, ...checkedSiblingIds.value]
  try {
    await addGuestsToInvite(props.inviteId, guestIds)
    selectedCandidateId.value = null
    suggestedSiblings.value = []
    emit('update:modelValue', false)
    emit('added')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível adicionar o convidado.'))
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Adicionar convidado"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <UiInput v-model="guestSearch" placeholder="Buscar convidado sem convite" />
      <ul class="flex max-h-40 flex-col gap-1 overflow-y-auto">
        <li v-for="candidate in candidatesData?.data ?? []" :key="candidate.id">
          <button
            type="button"
            class="w-full rounded-md border px-3 py-2 text-left text-sm"
            :class="
              selectedCandidateId === candidate.id
                ? 'border-primary bg-surface-muted'
                : 'border-border'
            "
            @click="selectCandidate(candidate.id)"
          >
            {{ candidate.full_name }}
          </button>
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
          :label="sibling.full_name"
          @update:model-value="
            (checked) =>
              checked ? checkedSiblingIds.add(sibling.id) : checkedSiblingIds.delete(sibling.id)
          "
        />
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="$emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton :disabled="!selectedCandidateId" @click="confirm">Adicionar</UiButton>
    </template>
  </UiModal>
</template>
