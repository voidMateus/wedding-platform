<script setup lang="ts">
import { formatDatePtBR } from '#shared/utils/format-date'
import type { InviteListItem } from '~/types/invite'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()

const { listInvites, deleteInvite } = useInvites()

const page = ref(1)
const search = ref('')
const statusFilter = ref('todos')
const PAGE_SIZE = 25

// includeArchived: true de propósito. O recorte "Arquivados" da barra de
// filtros não existiria sem isso — e hoje um convite arquivado desaparece da
// listagem sem nenhuma forma de reencontrá-lo pela UI (o arquivamento é feito
// na tela de detalhe). "Todos" continua escondendo arquivado, como antes.
const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: search.value.trim() || undefined,
  includeArchived: true,
}))

const { data, status, error, refresh } = listInvites(listParams)

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

const statusChips = [
  { value: 'todos', label: 'Todos' },
  { value: 'respondidos', label: 'Respondidos' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'arquivados', label: 'Arquivados' },
] as const

const visibleInvites = computed(() => {
  const rows = data.value?.data ?? []
  if (statusFilter.value === 'arquivados') return rows.filter((invite) => invite.arquivado_em)
  const active = rows.filter((invite) => !invite.arquivado_em)
  if (statusFilter.value === 'respondidos') {
    return active.filter((invite) => invite.responseStatus === 'responded')
  }
  if (statusFilter.value === 'aguardando') {
    return active.filter((invite) => invite.responseStatus !== 'responded')
  }
  return active
})

const peopleInView = computed(() =>
  visibleInvites.value.reduce((total, invite) => total + invite.memberCount, 0),
)

const totalLabel = computed(() => {
  const total = data.value?.meta.total ?? 0
  return `${total} convite${total === 1 ? '' : 's'}`
})

const columns = [
  { key: 'nome', label: 'Convite' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'pessoas', label: 'Pessoas', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
  { key: 'enviado', label: 'Enviado em', align: 'right' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
] as const

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
        v-model="search"
        icon="lucide:search"
        tone="muted"
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
          v-model="statusFilter"
          :items="statusChips"
          group-label="Filtrar convites por situação"
        />
      </template>

      <div v-if="status === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
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
        <AdminTable
          :columns="columns"
          :rows="visibleInvites"
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
