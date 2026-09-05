<script setup lang="ts">
import { formatDatePtBR } from '#shared/utils/format-date'
import type { InviteListItem, InviteResponseStatus } from '~/types/invite'
import type { AdminTableColumn } from '~/types/table'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()

const { listInvites, deleteInvite } = useInvites()

const page = ref(1)
const PAGE_SIZE = 25

// Arquivado continua sendo chip, e não filtro de coluna: é escopo da consulta
// (o soft delete do convite), não recorte de uma coluna da tabela. Sem ele um
// convite arquivado desapareceria da listagem sem forma de reencontrá-lo pela
// UI, já que o arquivamento é feito na tela de detalhe.
const archiveFilter = ref<'active' | 'archived'>('active')
const archiveChips = [
  { value: 'active', label: 'Ativos' },
  { value: 'archived', label: 'Arquivados' },
] as const

// Rótulo do estado consolidado, do mapa único de estados da plataforma. `sent`
// só muda o tom de "pendente" (providência ou não), nunca o texto — então aqui,
// onde a opção descreve o recorte e não um convite específico, `true` serve.
const statusOptions = INVITE_RESPONSE_STATUS_VALUES.map((value) => ({
  value,
  label: inviteResponsePresentation(value, { sent: true }).label,
}))

// Todo recorte é do endpoint, nunca da página carregada: a listagem é paginada,
// e filtrar aqui recortaria só os 25 da vez — era exatamente o que os chips
// antigos faziam ("Arquivados" só achava os arquivados que por acaso caíssem na
// página atual). O status consolidado passou a existir no banco, na view
// convites_com_resumo, justamente para poder ser filtrado e ordenado antes de
// paginar.
const columns = computed<AdminTableColumn<InviteListItem>[]>(() => [
  {
    key: 'nome',
    label: 'Convite',
    filter: { type: 'text', placeholder: 'Buscar convite' },
    sort: 'alpha',
  },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'pessoas', label: 'Pessoas', align: 'right', sort: 'numeric' },
  {
    key: 'status',
    label: 'Status',
    align: 'right',
    filter: { type: 'select', multiple: true, options: statusOptions },
  },
  { key: 'enviado', label: 'Enviado em', align: 'right', sort: 'date' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
])

const filters = useTableFilters(columns)

// O campo de busca do cabeçalho e o filtro de texto da coluna "Convite" são o
// mesmo estado, com duas portas de entrada — nunca dois recortes que podem
// divergir.
const searchDraft = useDebouncedText(
  () => filters.valuesOf('nome')[0] ?? '',
  (value) => filters.setText('nome', value),
)

// A URL é editável à mão: valor fora do catálogo é descartado aqui, senão o
// endpoint devolveria 400 (tela de erro) em vez da lista sem o recorte inválido.
const statusFilter = computed(() =>
  (filters.values.value.status ?? []).filter((value): value is InviteResponseStatus =>
    (INVITE_RESPONSE_STATUS_VALUES as readonly string[]).includes(value),
  ),
)

// Só as três que o endpoint sabe ordenar (a view resolve `pessoas` e `enviado`
// antes de paginar); qualquer outra coisa na URL vira "sem ordenação".
type InviteSortKey = 'nome' | 'pessoas' | 'enviado'
const INVITE_SORT_KEYS: readonly InviteSortKey[] = ['nome', 'pessoas', 'enviado']

const sortKey = computed<InviteSortKey | undefined>(() => {
  const key = filters.sortKey.value
  return INVITE_SORT_KEYS.find((candidate) => candidate === key)
})

const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: filters.values.value.nome?.[0],
  archived: archiveFilter.value,
  responseStatus: statusFilter.value.length ? statusFilter.value : undefined,
  sort: sortKey.value,
  dir: filters.sortDirection.value,
}))

const { data, status, error, refresh } = listInvites(listParams)

// Esqueleto só na primeira carga: trocar a tabela por esqueleto a cada recorte
// desmontaria o cabeçalho e, com ele, o menu de filtro aberto — marcar dois
// status seguidos viraria impossível. Enquanto atualiza, a lista anterior
// continua na tela, esmaecida.
const isFirstLoad = computed(() => status.value === 'pending' && !data.value)
const isRefreshing = computed(() => status.value === 'pending' && Boolean(data.value))

// Mudou o recorte, a página 3 do resultado anterior não descreve nada no novo.
watch([filters.values, filters.sortKey, filters.sortDirection, archiveFilter], () => {
  page.value = 1
})

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

const visibleInvites = computed(() => data.value?.data ?? [])

const peopleInView = computed(() =>
  visibleInvites.value.reduce((total, invite) => total + invite.memberCount, 0),
)

const totalLabel = computed(() => {
  const total = data.value?.meta.total ?? 0
  return `${total} convite${total === 1 ? '' : 's'}`
})

// Badge também na tabela (preferência do usuário em 2026-09-04, depois de ver
// as duas apresentações lado a lado): o preenchimento suave separa o status do
// resto da linha melhor que o texto colorido. Rótulo e tom continuam vindo do
// mapa único, então tabela e modal nunca divergem de significado.
function statusOf(invite: InviteListItem) {
  return inviteResponsePresentation(invite.responseStatus, {
    sent: invite.status_convite === 'enviado',
  })
}

// --- criar/abrir ---
//
// Mesma convenção da listagem de convidados: o modal é governado pela URL
// (`?novo=1` / `?editar=<id>`), então link salvo, busca global e o botão
// Voltar do navegador continuam funcionando.
const openInviteId = computed(() =>
  typeof route.query.editar === 'string' ? route.query.editar : null,
)
const isCreateModalOpen = computed(() => route.query.novo === '1')
const isDetailModalOpen = computed(() => Boolean(openInviteId.value))

function openCreateModal() {
  router.push({ query: { ...route.query, novo: '1', editar: undefined } })
}

function openDetailModal(invite: InviteListItem) {
  router.push({ query: { ...route.query, novo: undefined, editar: invite.id } })
}

// replace, não push: fechar o modal não pode deixar um passo a mais no
// histórico — Voltar tem que sair da listagem.
function closeModals() {
  router.replace({ query: { ...route.query, novo: undefined, editar: undefined } })
}

// Criar abre direto o convite recém-criado: é no detalhe que se vinculam os
// convidados e se gera o link de acesso — um convite vazio não serve de nada.
async function handleInviteCreated(invite: { id: string }) {
  await refresh()
  await router.replace({ query: { ...route.query, novo: undefined, editar: invite.id } })
}

// --- excluir ---

const deleteTargetId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(id: string) {
  deleteTargetId.value = id
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTargetId.value) return
  isDeleting.value = true
  try {
    await deleteInvite(deleteTargetId.value)
    isDeleteModalOpen.value = false
    deleteTargetId.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <AdminSection title="Convites" :meta="totalLabel">
    <template #actions>
      <UiInput
        v-model="searchDraft"
        icon="lucide:search"
        tone="muted"
        aria-label="Filtrar convites por nome"
        placeholder="Filtrar por nome..."
        class="w-full sm:w-64"
      />
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar convite
      </UiButton>
    </template>

    <AdminPanel
      title="Registro de envios"
      :meta="`${visibleInvites.length} exibidos · ${peopleInView} pessoas`"
    >
      <template #headerActions>
        <AdminFilterChips
          v-model="archiveFilter"
          :items="archiveChips"
          group-label="Ver convites ativos ou arquivados"
        />
        <AdminTableFilterBar
          :columns="columns"
          :filters="filters"
          group-label="Filtros da lista de convites"
        />
      </template>

      <div v-if="isFirstLoad" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:alert-triangle"
          title="Não foi possível carregar os convites"
          description="Verifique sua conexão e tente novamente."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <div v-else-if="!data?.data.length" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:mail"
          title="Nenhum convite cadastrado ainda"
          description="Convites nascem automaticamente ao cadastrar convidados com acompanhantes, ou crie um manualmente."
        >
          <UiButton @click="openCreateModal">Adicionar convite</UiButton>
        </UiEmptyState>
      </div>

      <template v-else>
        <div :class="isRefreshing && 'opacity-60'" class="transition-brand">
          <AdminTable
            :columns="columns"
            :rows="visibleInvites"
            :filters="filters"
            row-clickable
            empty-label="Nenhum convite com esse recorte."
            @row-click="openDetailModal"
          >
            <template #cell-nome="{ row }">
              <button
                type="button"
                class="font-medium text-text transition-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="openDetailModal(row)"
              >
                {{ row.nome }}
              </button>
              <UiBadge v-if="row.arquivado_em" tone="neutral" class="ml-2">arquivado</UiBadge>
            </template>

            <template #cell-responsavel="{ row }">
              <span v-if="row.responsibleGuestName" class="text-text-muted">
                {{ row.responsibleGuestName }}
              </span>
              <span v-else class="text-text-muted">—</span>
            </template>

            <template #cell-pessoas="{ row }">
              <span class="num text-text-muted">{{ row.memberCount }}</span>
            </template>

            <template #cell-status="{ row }">
              <UiBadge :tone="statusOf(row).tone">{{ statusOf(row).label }}</UiBadge>
            </template>

            <template #cell-enviado="{ row }">
              <span class="text-text-muted">{{ formatDatePtBR(row.enviado_em) }}</span>
            </template>

            <template #cell-acoes="{ row }">
              <span class="inline-flex justify-end gap-1">
                <AdminRowAction
                  icon="lucide:pencil"
                  :label="`Abrir convite ${row.nome}`"
                  @click="openDetailModal(row)"
                />
                <AdminRowAction
                  icon="lucide:trash-2"
                  tone="danger"
                  :label="`Excluir convite ${row.nome}`"
                  @click="openDeleteModal(row.id)"
                />
              </span>
            </template>
          </AdminTable>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5"
        >
          <span>{{ totalLabel }}</span>
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

    <AdminInvitesInviteCreateModal
      :model-value="isCreateModalOpen"
      @update:model-value="(isOpen) => !isOpen && closeModals()"
      @created="handleInviteCreated"
    />

    <AdminInvitesInviteDetailModal
      :model-value="isDetailModalOpen"
      :invite-id="openInviteId"
      @update:model-value="(isOpen) => !isOpen && closeModals()"
      @changed="refresh()"
    />

    <UiModal v-model="isDeleteModalOpen" title="Excluir convite">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir este convite? Os convidados não são excluídos — só perdem o
        vínculo com o convite.
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
