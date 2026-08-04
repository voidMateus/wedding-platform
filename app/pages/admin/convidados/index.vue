<script setup lang="ts">
import { computeIsChild } from '#shared/utils/guest-age'
import type { Guest } from '~/types/guest'

definePageMeta({ layout: 'admin' })

const { listGuests, deleteGuest } = useGuests()
const { listGroups } = useGroups()
const { getWedding } = useWedding()

const { data: wedding } = getWedding()
const childMaxAge = computed(() => wedding.value?.child_max_age ?? 11)

const page = ref(1)
const search = ref('')
const groupFilter = ref('')
const PAGE_SIZE = 25

const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: search.value.trim() || undefined,
  groupId: groupFilter.value || undefined,
}))

const { data, status, refresh } = listGuests(listParams)

const { data: groupsData } = listGroups({ pageSize: 100 })
const groupOptions = computed(
  () => groupsData.value?.data.map((g) => ({ value: g.id, label: g.name })) ?? [],
)

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

// 👥 acompanhantes — contagem por party_id na página atual (sem round-trip
// extra: a listagem já traz party_id, só precisa agrupar).
const companionCountByParty = computed(() => {
  const counts = new Map<string, number>()
  for (const guest of data.value?.data ?? []) {
    if (!guest.party_id) continue
    counts.set(guest.party_id, (counts.get(guest.party_id) ?? 0) + 1)
  }
  return counts
})

function companionCount(guest: Guest): number {
  if (!guest.party_id) return 0
  return (companionCountByParty.value.get(guest.party_id) ?? 1) - 1
}

const expandedPartyId = ref<string | null>(null)
function togglePartyExpand(guest: Guest) {
  if (!guest.party_id) return
  expandedPartyId.value = expandedPartyId.value === guest.party_id ? null : guest.party_id
}

// --- excluir ---

const deleteTarget = ref<Guest | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(guest: Guest) {
  deleteTarget.value = guest
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteGuest(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <AdminSection title="Convidados" description="Cadastre convidados e seus acompanhantes em um único fluxo.">
    <template #actions>
      <UiButton to="/admin/convidados/novo">Novo convidado</UiButton>
    </template>

    <div class="flex flex-wrap gap-3">
      <UiInput v-model="search" placeholder="Buscar por nome" class="max-w-xs" @keyup.enter="page = 1" />
      <UiSelect
        v-model="groupFilter"
        placeholder="Todos os grupos"
        :options="groupOptions"
        @update:model-value="page = 1"
      />
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      icon="lucide:users"
      title="Nenhum convidado encontrado"
      description="Ajuste os filtros ou cadastre o primeiro convidado."
    >
      <UiButton to="/admin/convidados/novo">Novo convidado</UiButton>
    </UiEmptyState>

    <template v-else>
      <UiTable>
        <template #head>
          <th class="px-4 py-2 font-medium">Nome</th>
          <th class="px-4 py-2 font-medium">Grupo</th>
          <th class="px-4 py-2 font-medium">Restrições</th>
          <th class="px-4 py-2 font-medium">Acompanhantes</th>
          <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
        </template>
        <template v-for="guest in data?.data" :key="guest.id">
          <tr class="border-t border-border transition-brand hover:bg-surface-muted/60">
            <td class="px-4 py-2 text-text">
              {{ guest.full_name }}
              <UiBadge v-if="computeIsChild(guest.birth_date, childMaxAge)" tone="neutral" class="ml-2">
                criança
              </UiBadge>
              <UiBadge v-if="guest.wedding_role" tone="success" class="ml-2">
                {{ guest.wedding_role === 'padrinho' ? 'Padrinho' : 'Madrinha' }}
              </UiBadge>
            </td>
            <td class="px-4 py-2 text-text-muted">
              {{ groupOptions.find((g) => g.value === guest.group_id)?.label ?? '—' }}
            </td>
            <td class="px-4 py-2 text-text-muted">{{ guest.dietary_restrictions || '—' }}</td>
            <td class="px-4 py-2 text-text-muted">
              <button
                v-if="companionCount(guest) > 0"
                type="button"
                class="inline-flex items-center gap-1 hover:underline"
                @click="togglePartyExpand(guest)"
              >
                <Icon
                  :name="expandedPartyId === guest.party_id ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                  class="h-3.5 w-3.5"
                />
                👥 {{ companionCount(guest) }}
              </button>
              <span v-else>—</span>
            </td>
            <td class="px-4 py-2">
              <div class="flex justify-end gap-2">
                <UiButton size="sm" variant="ghost" :to="`/admin/convidados/${guest.id}`">
                  Editar
                </UiButton>
                <UiButton size="sm" variant="destructive" @click="openDeleteModal(guest)">
                  Excluir
                </UiButton>
              </div>
            </td>
          </tr>
          <tr v-if="expandedPartyId === guest.party_id && companionCount(guest) > 0" class="bg-surface-muted">
            <td colspan="5" class="px-4 py-2 text-sm text-text-muted">
              <ul class="flex flex-col gap-1">
                <li
                  v-for="companion in data?.data.filter(
                    (g) => g.party_id === guest.party_id && g.id !== guest.id,
                  )"
                  :key="companion.id"
                >
                  • {{ companion.full_name }}
                </li>
              </ul>
            </td>
          </tr>
        </template>
      </UiTable>

      <div class="flex items-center justify-between text-sm text-text-muted">
        <span>{{ data?.meta.total ?? 0 }} convidado(s)</span>
        <div class="flex items-center gap-2">
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
          >
            Anterior
          </UiButton>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="page >= totalPages"
            @click="page = Math.min(totalPages, page + 1)"
          >
            Próxima
          </UiButton>
        </div>
      </div>
    </template>

    <UiModal v-model="isDeleteModalOpen" title="Excluir convidado">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.full_name }}</strong
        >? O histórico de RSVP/presentes associados é preservado.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmDelete">
          Excluir
        </UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
