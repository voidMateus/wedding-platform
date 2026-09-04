<script setup lang="ts">
import { computeIsChild } from '#shared/utils/guest-age'
import type { Guest } from '~/types/guest'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()

const { listGuests, deleteGuest } = useGuests()
const { listGroups } = useGroups()
const { getWedding } = useWedding()

const { data: wedding } = getWedding()
const childMaxAge = computed(() => wedding.value?.idade_maxima_crianca ?? 11)

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

const { data, status, error, refresh } = listGuests(listParams)

const { data: groupsData } = listGroups({ pageSize: 100 })
const groupOptions = computed(
  () => groupsData.value?.data.map((g) => ({ value: g.id, label: g.nome })) ?? [],
)

// Recorte por grupo em chip, no lugar do select — a barra de filtros do painel
// é a mesma linguagem em todas as listas do admin.
//
// TODO(admin/convidados): o desenho original pedia também os recortes de RSVP
// (Todos / Confirmados / Pendentes / Recusados) e uma coluna Status. O total
// de confirmados do cabeçalho já vem de /api/guests (`summary.confirmed`,
// agregado no banco), mas isso é um número só: cada linha de `data` continua
// sendo `convidados.Row` puro, sem o status daquela pessoa. Para os chips e a
// coluna, /api/guests precisa devolver o status por convidado (embed de
// respostas_rsvp na consulta da página) e aceitar um filtro por status —
// feito isso, basta somar os chips a `groupChips` e a coluna a `columns`.
const groupChips = computed(() => [
  { value: '', label: 'Todos' },
  ...groupOptions.value.map((option) => ({ value: option.value, label: option.label })),
])

function handleGroupChange(value: string): void {
  groupFilter.value = value
  page.value = 1
}

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

const peopleLabel = computed(() => {
  const total = data.value?.meta.total ?? 0
  return `${total} ${total === 1 ? 'pessoa' : 'pessoas'}`
})

// Descreve o recorte inteiro (filtro de nome/grupo incluído), não a página —
// é por isso que o confirmado vem agregado de /api/guests e não de `data`.
const totalLabel = computed(() => {
  const confirmed = data.value?.summary.confirmed ?? 0
  return `${peopleLabel.value} · ${confirmed} confirmado${confirmed === 1 ? '' : 's'}`
})

// 👥 acompanhantes — contagem por nucleo_id na página atual (sem round-trip
// extra: a listagem já traz nucleo_id, só precisa agrupar).
const companionCountByParty = computed(() => {
  const counts = new Map<string, number>()
  for (const guest of data.value?.data ?? []) {
    if (!guest.nucleo_id) continue
    counts.set(guest.nucleo_id, (counts.get(guest.nucleo_id) ?? 0) + 1)
  }
  return counts
})

function companionCount(guest: Guest): number {
  if (!guest.nucleo_id) return 0
  return (companionCountByParty.value.get(guest.nucleo_id) ?? 1) - 1
}

const expandedPartyId = ref<string | null>(null)
function togglePartyExpand(guest: Guest) {
  if (!guest.nucleo_id) return
  expandedPartyId.value = expandedPartyId.value === guest.nucleo_id ? null : guest.nucleo_id
}

function isPartyExpanded(guest: Guest): boolean {
  return Boolean(
    guest.nucleo_id && expandedPartyId.value === guest.nucleo_id && companionCount(guest) > 0,
  )
}

function companionsOf(guest: Guest): Guest[] {
  return (data.value?.data ?? []).filter(
    (candidate) => candidate.nucleo_id === guest.nucleo_id && candidate.id !== guest.id,
  )
}

function groupNameOf(guest: Guest): string {
  return groupOptions.value.find((option) => option.value === guest.grupo_id)?.label ?? '—'
}

const columns = [
  { key: 'nome', label: 'Convidado' },
  { key: 'grupo', label: 'Grupo' },
  { key: 'acompanhantes', label: 'Acompanhantes' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
] as const

// --- criar/editar ---
//
// O modal é governado pela URL (`?novo=1` / `?editar=<id>`), não por um ref
// local: assim o link da busca global, o atalho do dashboard e o botão Voltar
// do navegador continuam funcionando, e o endereço do que está aberto segue
// compartilhável — como era com as telas dedicadas que o modal substituiu.
const editingGuestId = computed(() =>
  typeof route.query.editar === 'string' ? route.query.editar : null,
)
const isGuestModalOpen = computed(() => route.query.novo === '1' || Boolean(editingGuestId.value))

function openCreateGuest() {
  router.push({ query: { ...route.query, novo: '1', editar: undefined } })
}

function openEditGuest(guest: Guest) {
  router.push({ query: { ...route.query, novo: undefined, editar: guest.id } })
}

// replace, não push: fechar o modal não pode deixar um passo a mais no
// histórico — Voltar tem que sair da listagem, não reabrir o que acabou de
// ser fechado.
function closeGuestModal() {
  router.replace({ query: { ...route.query, novo: undefined, editar: undefined } })
}

async function handleGuestSaved() {
  await refresh()
  closeGuestModal()
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
  <AdminSection title="Convidados" :meta="totalLabel">
    <template #actions>
      <UiInput
        v-model="search"
        icon="lucide:search"
        tone="muted"
        placeholder="Filtrar por nome..."
        class="w-full sm:w-64"
        @keyup.enter="page = 1"
      />
      <UiButton @click="openCreateGuest">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar convidado
      </UiButton>
    </template>

    <AdminPanel title="Lista de convidados" :meta="`${data?.data.length ?? 0} exibidos`">
      <template #headerActions>
        <AdminFilterChips
          :model-value="groupFilter"
          :items="groupChips"
          group-label="Filtrar convidados por grupo"
          @update:model-value="handleGroupChange"
        />
      </template>

      <div v-if="status === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:alert-triangle"
          title="Não foi possível carregar os convidados"
          description="Verifique sua conexão e tente novamente."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <template v-else>
        <AdminTable
          :columns="columns"
          :rows="data?.data ?? []"
          :is-expanded="isPartyExpanded"
          row-clickable
          empty-label="Nenhum convidado com esses filtros."
          @row-click="openEditGuest"
        >
          <template #cell-nome="{ row }">
            <button
              type="button"
              class="font-medium text-text transition-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="openEditGuest(row)"
            >
              {{ row.nome_completo }}
            </button>
            <UiBadge
              v-if="computeIsChild(row.data_nascimento, childMaxAge)"
              tone="neutral"
              class="ml-2"
            >
              criança
            </UiBadge>
            <!-- primary: papel no casamento é identidade, não estado. -->
            <UiBadge v-if="row.papel_casamento" tone="primary" class="ml-2">
              {{ row.papel_casamento === 'padrinho' ? 'Padrinho' : 'Madrinha' }}
            </UiBadge>
          </template>

          <template #cell-grupo="{ row }">
            <span class="text-text-muted">{{ groupNameOf(row) }}</span>
          </template>

          <template #cell-acompanhantes="{ row }">
            <button
              v-if="companionCount(row) > 0"
              type="button"
              class="inline-flex items-center gap-1 text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :aria-expanded="isPartyExpanded(row)"
              @click="togglePartyExpand(row)"
            >
              <Icon
                :name="isPartyExpanded(row) ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                class="h-3.5 w-3.5"
              />
              <span class="num">{{ companionCount(row) }}</span>
            </button>
            <span v-else class="text-text-muted">—</span>
          </template>

          <template #cell-acoes="{ row }">
            <span class="inline-flex justify-end gap-1">
              <AdminRowAction
                icon="lucide:pencil"
                :label="`Editar ${row.nome_completo}`"
                @click="openEditGuest(row)"
              />
              <AdminRowAction
                icon="lucide:trash-2"
                tone="danger"
                :label="`Excluir ${row.nome_completo}`"
                @click="openDeleteModal(row)"
              />
            </span>
          </template>

          <template #detail="{ row }">
            <p class="mb-1 text-xs uppercase tracking-wide text-text-muted">Acompanhantes</p>
            <ul class="flex flex-col gap-1 text-sm text-text-muted">
              <li v-for="companion in companionsOf(row)" :key="companion.id">
                {{ companion.nome_completo }}
              </li>
            </ul>
          </template>
        </AdminTable>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5"
        >
          <span>{{ peopleLabel }}</span>
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
    </AdminPanel>

    <AdminGuestsGuestPartyModal
      :model-value="isGuestModalOpen"
      :guest-id="editingGuestId"
      @update:model-value="(isOpen) => !isOpen && closeGuestModal()"
      @saved="handleGuestSaved"
    />

    <UiModal v-model="isDeleteModalOpen" title="Excluir convidado">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.nome_completo }}</strong
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
