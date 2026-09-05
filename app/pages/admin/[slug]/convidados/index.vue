<script setup lang="ts">
import { isFaixaEtariaFiltro } from '#shared/utils/faixa-etaria'
import { RSVP_STATUS_VALUES, isRsvpStatus } from '#shared/utils/rsvp-status'
import type { GuestListItem } from '~/types/guest'
import type { AdminTableColumn } from '~/types/table'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()

const { listGuests, deleteGuest } = useGuests()
const { listGroups } = useGroups()
const { classify, label: ageGroupLabel, originLabel, filterChips } = useAgeGroups()

const page = ref(1)
const PAGE_SIZE = 25

const { data: groupsData } = listGroups({ pageSize: 100 })
const groupOptions = computed(
  () => groupsData.value?.data.map((g) => ({ value: g.id, label: g.nome })) ?? [],
)

// Rótulo e cor saem do mapa único de estados da plataforma — a mesma fonte do
// badge do modal de convite, para status nenhum significar duas coisas.
const statusOptions = RSVP_STATUS_VALUES.map((status) => ({
  value: status,
  label: rsvpStatusPresentation(status).label,
}))

// Cada recorte é o filtro da própria coluna, não mais uma fileira de chips no
// cabeçalho: com um chip por grupo, o painel virava uma parede de botões em
// qualquer casamento com mais de meia dúzia de etiquetas. O estado vive na URL
// (`?nome=&status=&faixa=&grupo=&ordenar=&direcao=`, ver useTableFilters),
// então o link do dashboard para "as 8 crianças" (`?faixa=crianca`) continua
// valendo igual.
//
// Status, faixa e grupo são de múltipla escolha (`?status=pendente,lista_espera`):
// "quem ainda não respondeu" e "quem está na espera" são a mesma tarefa para o
// casal, e obrigar a olhar um recorte de cada vez transformaria uma pergunta em
// duas. Exige que /api/guests aceite lista nesses parâmetros — sem isso o
// segundo valor seria ignorado em silêncio, que é o pior desfecho possível.
const columns = computed<AdminTableColumn<GuestListItem>[]>(() => [
  {
    key: 'nome',
    label: 'Convidado',
    filter: { type: 'text', placeholder: 'Buscar nome' },
    sort: 'alpha',
  },
  {
    key: 'status',
    label: 'Status',
    filter: { type: 'select', multiple: true, options: statusOptions },
  },
  {
    key: 'faixa',
    label: 'Faixa etária',
    filter: { type: 'select', multiple: true, options: filterChips.value },
  },
  {
    key: 'grupo',
    label: 'Grupo',
    filter: { type: 'select', multiple: true, options: groupOptions.value },
  },
  { key: 'acompanhantes', label: 'Acompanhantes' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
])

const filters = useTableFilters(columns)

// O campo de busca do cabeçalho e o filtro de texto da coluna "Convidado" são
// o mesmo estado, com duas portas de entrada — nunca dois recortes que podem
// divergir. Por isso remover o chip do filtro limpa também a caixa de busca.
const searchDraft = useDebouncedText(
  () => filters.valuesOf('nome')[0] ?? '',
  (value) => filters.setText('nome', value),
)

// Os dois guardas existem porque a URL é editável à mão: o endpoint valida por
// Zod e devolveria 400 (tela de erro) em vez de lista sem o recorte inválido.
const ageGroupFilter = computed(() =>
  (filters.values.value.faixa ?? []).filter((value) => isFaixaEtariaFiltro(value)),
)

const statusFilter = computed(() =>
  (filters.values.value.status ?? []).filter((value) => isRsvpStatus(value)),
)

function listOrUndefined<T>(values: T[]): T[] | undefined {
  return values.length ? values : undefined
}

const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: filters.values.value.nome?.[0],
  groupId: listOrUndefined(filters.values.value.grupo ?? []),
  ageGroup: listOrUndefined(ageGroupFilter.value),
  statusRsvp: listOrUndefined(statusFilter.value),
  sort: filters.sortKey.value === 'nome' ? ('nome' as const) : undefined,
  dir: filters.sortDirection.value,
}))

const { data, status, error, refresh } = listGuests(listParams)

// Esqueleto só na primeira carga. Trocar a tabela por esqueleto a cada recorte
// desmontaria o cabeçalho — e com ele o menu de filtro aberto, que é onde o
// clique acabou de acontecer: marcar duas faixas etárias seguidas viraria
// impossível, porque o menu fecharia sozinho depois da primeira. Enquanto
// atualiza, a lista anterior continua na tela, esmaecida.
const isFirstLoad = computed(() => status.value === 'pending' && !data.value)
const isRefreshing = computed(() => status.value === 'pending' && Boolean(data.value))

// Mudou o recorte, a página 4 do resultado anterior não descreve nada no novo —
// sem isto o casal filtra e vê "nenhum convidado" porque continuou depois do
// fim da lista nova.
watch([filters.values, filters.sortKey, filters.sortDirection], () => {
  page.value = 1
})

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

function companionCount(guest: GuestListItem): number {
  if (!guest.nucleo_id) return 0
  return (companionCountByParty.value.get(guest.nucleo_id) ?? 1) - 1
}

const expandedPartyId = ref<string | null>(null)
function togglePartyExpand(guest: GuestListItem) {
  if (!guest.nucleo_id) return
  expandedPartyId.value = expandedPartyId.value === guest.nucleo_id ? null : guest.nucleo_id
}

function isPartyExpanded(guest: GuestListItem): boolean {
  return Boolean(
    guest.nucleo_id && expandedPartyId.value === guest.nucleo_id && companionCount(guest) > 0,
  )
}

function companionsOf(guest: GuestListItem): GuestListItem[] {
  return (data.value?.data ?? []).filter(
    (candidate) => candidate.nucleo_id === guest.nucleo_id && candidate.id !== guest.id,
  )
}

// Classificado uma vez por linha (mesmo padrão de companionCountByParty):
// o template lê rótulo e procedência do mesmo resultado, sem reclassificar a
// cada interpolação.
const ageGroupByGuest = computed(() => {
  const cells = new Map<string, { label: string; title: string }>()
  for (const guest of data.value?.data ?? []) {
    const classificacao = classify(guest)
    cells.set(guest.id, {
      label: classificacao.chave ? ageGroupLabel(classificacao.chave) : '—',
      title: originLabel(classificacao.origem),
    })
  }
  return cells
})

function groupNameOf(guest: GuestListItem): string {
  return groupOptions.value.find((option) => option.value === guest.grupo_id)?.label ?? '—'
}

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

function openEditGuest(guest: GuestListItem) {
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

const deleteTarget = ref<GuestListItem | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(guest: GuestListItem) {
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
        v-model="searchDraft"
        icon="lucide:search"
        tone="muted"
        aria-label="Filtrar convidados por nome"
        placeholder="Filtrar por nome..."
        class="w-full sm:w-64"
      />
      <UiButton @click="openCreateGuest">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar convidado
      </UiButton>
    </template>

    <AdminPanel title="Lista de convidados" :meta="`${data?.data.length ?? 0} exibidos`">
      <template #headerActions>
        <AdminTableFilterBar
          :columns="columns"
          :filters="filters"
          group-label="Filtros da lista de convidados"
        />
      </template>

      <div v-if="isFirstLoad" class="flex flex-col gap-2 p-4 sm:p-5">
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
        <div :class="isRefreshing && 'opacity-60'" class="transition-brand">
          <AdminTable
            :columns="columns"
            :rows="data?.data ?? []"
            :filters="filters"
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
              <!-- primary: papel no casamento é identidade, não estado. -->
              <UiBadge v-if="row.papel_casamento" tone="primary" class="ml-2">
                {{ row.papel_casamento === 'padrinho' ? 'Padrinho' : 'Madrinha' }}
              </UiBadge>
            </template>

            <!-- Sempre a classificação válida PARA ESTE evento: derivada da
               idade na data do casamento contra as faixas configuradas, com a
               procedência no title (calculada x informada à mão). -->
            <template #cell-status="{ row }">
              <UiBadge :tone="rsvpStatusPresentation(row.status_rsvp).tone">
                {{ rsvpStatusPresentation(row.status_rsvp).label }}
              </UiBadge>
            </template>

            <template #cell-faixa="{ row }">
              <span class="text-text-muted" :title="ageGroupByGuest.get(row.id)?.title">
                {{ ageGroupByGuest.get(row.id)?.label ?? '—' }}
              </span>
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
        </div>

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
