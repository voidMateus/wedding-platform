<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { GuestDetail } from '~/composables/useGuests'
import type { Group } from '~/types/group'

const COMPANION_SEARCH_MIN_CHARS = 2
const COMPANION_SEARCH_PAGE_SIZE = 6

export interface CompanionEntry {
  key: string
  person: GuestPersonInput
}

interface Props {
  modelValue: CompanionEntry[]
  groupOptions: Array<{ value: string; label: string }>
  /** Excluído da busca de convidado existente — normalmente o próprio responsável. */
  primaryId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CompanionEntry[]]
  'group-created': [group: Group]
  /** Disparado quando um acompanhante removido já existia cadastrado — o wizard acumula pra excluir do grupo no submit. */
  'remove-existing': [guestId: string]
}>()

function emptyPerson(): GuestPersonInput {
  return {
    nomeCompleto: '',
    apelido: '',
    sexo: undefined,
    dataNascimento: '',
    papelCasamento: undefined,
    restricoesAlimentares: '',
    observacoes: '',
    grupoId: '',
  }
}

function personFromGuest(guest: GuestDetail): GuestPersonInput {
  return {
    id: guest.id,
    nomeCompleto: guest.nome_completo ?? '',
    apelido: guest.apelido ?? '',
    sexo: (guest.sexo as GuestPersonInput['sexo']) ?? undefined,
    dataNascimento: guest.data_nascimento ?? '',
    papelCasamento: (guest.papel_casamento as GuestPersonInput['papelCasamento']) ?? undefined,
    restricoesAlimentares: guest.restricoes_alimentares ?? '',
    observacoes: guest.observacoes ?? '',
    grupoId: guest.grupo_id ?? '',
  }
}

const { fetchGuests, fetchGuestDetail } = useGuests()

const isAddingCompanion = ref(false)
const companionDraft = ref<GuestPersonInput>(emptyPerson())
const editingCompanionKey = ref<string | null>(null)
const companionDraftError = ref<string | null>(null)

// Busca convidados já cadastrados antes de assumir que o acompanhante é uma
// pessoa nova (CLAUDE.md, seção 12.1) — evita duplicar quem já existe.
const companionSearchQuery = ref('')
const companionSearchResults = ref<Array<{ id: string; nome_completo: string }>>([])

const debouncedCompanionSearch = useDebounceFn(async (value: string) => {
  const excludeIds = new Set(
    [props.primaryId, ...props.modelValue.map((c) => c.person.id)].filter(Boolean),
  )
  const response = await fetchGuests({
    search: value,
    withoutParty: true,
    pageSize: COMPANION_SEARCH_PAGE_SIZE,
  })
  companionSearchResults.value = response.data.filter((g) => !excludeIds.has(g.id))
}, 300)

watch(companionSearchQuery, (value) => {
  if (value.trim().length < COMPANION_SEARCH_MIN_CHARS) {
    companionSearchResults.value = []
    return
  }
  debouncedCompanionSearch(value.trim())
})

async function selectExistingCompanion(guestId: string) {
  const detail = await fetchGuestDetail(guestId)
  companionDraft.value = personFromGuest(detail)
  companionDraftError.value = null
  companionSearchQuery.value = ''
  companionSearchResults.value = []
}

function startAddCompanion() {
  companionDraft.value = emptyPerson()
  editingCompanionKey.value = null
  companionDraftError.value = null
  companionSearchQuery.value = ''
  companionSearchResults.value = []
  isAddingCompanion.value = true
}

function startEditCompanion(entry: CompanionEntry) {
  companionDraft.value = { ...entry.person }
  editingCompanionKey.value = entry.key
  companionDraftError.value = null
  isAddingCompanion.value = true
}

function confirmCompanion() {
  if (!companionDraft.value.nomeCompleto.trim()) {
    companionDraftError.value = 'Informe o nome do acompanhante.'
    return
  }
  companionDraftError.value = null

  if (editingCompanionKey.value) {
    emit(
      'update:modelValue',
      props.modelValue.map((c) =>
        c.key === editingCompanionKey.value ? { ...c, person: { ...companionDraft.value } } : c,
      ),
    )
  } else {
    emit('update:modelValue', [
      ...props.modelValue,
      {
        key:
          companionDraft.value.id ?? `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        person: { ...companionDraft.value },
      },
    ])
  }

  isAddingCompanion.value = false
  editingCompanionKey.value = null
}

function removeCompanion(entry: CompanionEntry) {
  if (entry.person.id) {
    emit('remove-existing', entry.person.id)
  }
  emit(
    'update:modelValue',
    props.modelValue.filter((c) => c.key !== entry.key),
  )
}

function moveCompanion(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= props.modelValue.length) return
  const list = [...props.modelValue]
  const temp = list[index]!
  list[index] = list[target]!
  list[target] = temp
  emit('update:modelValue', list)
}
</script>

<template>
  <div>
    <h2 class="mb-1 text-lg font-medium text-text">Acompanhantes</h2>
    <p class="mb-4 text-sm text-text-muted">
      Casal, pais e filhos, mesma residência, amigos inseparáveis — qualquer conjunto que
      normalmente é convidado junto.
    </p>

    <p v-if="!modelValue.length" class="text-sm text-text-muted">Nenhum acompanhante cadastrado.</p>

    <ul v-else class="mb-4 flex flex-col gap-2">
      <li
        v-for="(entry, index) in modelValue"
        :key="entry.key"
        class="flex items-center justify-between rounded-md border border-border px-3 py-2"
      >
        <span class="text-sm text-text">{{ entry.person.nomeCompleto }}</span>
        <div class="flex items-center gap-1">
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="index === 0"
            @click="moveCompanion(index, -1)"
          >
            <Icon name="lucide:chevron-up" class="h-4 w-4" />
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="index === modelValue.length - 1"
            @click="moveCompanion(index, 1)"
          >
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="startEditCompanion(entry)">Editar</UiButton>
          <UiButton size="sm" variant="destructive" @click="removeCompanion(entry)"
            >Remover</UiButton
          >
        </div>
      </li>
    </ul>

    <div v-if="isAddingCompanion" class="mb-4 rounded-md border border-border p-4">
      <div v-if="!editingCompanionKey" class="mb-4 flex flex-col gap-2">
        <UiInput
          v-model="companionSearchQuery"
          placeholder="Buscar convidado já cadastrado (opcional)"
        />
        <ul v-if="companionSearchResults.length" class="flex flex-col gap-1">
          <li v-for="result in companionSearchResults" :key="result.id">
            <button
              type="button"
              class="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
              @click="selectExistingCompanion(result.id)"
            >
              {{ result.nome_completo }}
            </button>
          </li>
        </ul>
        <p v-if="companionDraft.id" class="text-xs text-green-700">
          Convidado existente selecionado — revise os dados abaixo antes de confirmar.
        </p>
      </div>
      <AdminGuestsGuestPersonFields
        v-model="companionDraft"
        :group-options="groupOptions"
        :full-name-error="companionDraftError"
        @group-created="(group) => emit('group-created', group)"
      />
      <div class="mt-4 flex justify-end gap-2">
        <UiButton variant="ghost" @click="isAddingCompanion = false">Cancelar</UiButton>
        <UiButton @click="confirmCompanion">Confirmar</UiButton>
      </div>
    </div>

    <UiButton v-else variant="outline" @click="startAddCompanion"
      >+ Adicionar acompanhante</UiButton
    >
  </div>
</template>
