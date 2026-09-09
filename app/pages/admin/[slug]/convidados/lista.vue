<script setup lang="ts">
import { FAIXA_ETARIA_ROTULOS_PLURAL } from '#shared/utils/faixa-etaria'
import type { GuestListItem } from '~/types/guest'
import { applyTableFilters } from '~/utils/table-rows'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const slug = useActiveWeddingSlug()

const { deleteGuest, exportGuests } = useGuests()
const { listGroups } = useGroups()

// A lista INTEIRA, não uma página: o agrupamento em blocos e os contadores por
// faixa etária descrevem o conjunto, e nenhum dos dois é possível com 25 linhas
// na mão. Ver useGuestListMode para o porquê de reusar /api/guests em laço em
// vez de um endpoint próprio.
const { data, status, error, refresh } = useGuestListMode()
const { data: gruposData, refresh: refreshGrupos } = listGroups({ pageSize: 100 })

const convidados = computed(() => data.value?.convidados ?? [])
const grupos = computed(() => gruposData.value?.data ?? [])

const { colunas, acessores, faixaPorConvidado, rotuloDeNucleo } =
  useGuestListModeColumns(convidados)

const filters = useTableFilters(colunas)

// O campo de busca do cabeçalho e o filtro de texto da coluna "Nome" são o
// mesmo estado, com duas portas de entrada — nunca dois recortes que podem
// divergir.
const searchDraft = useDebouncedText(
  () => filters.valuesOf('nome')[0] ?? '',
  (value) => filters.setText('nome', value),
)

const linhasFiltradas = computed(() =>
  applyTableFilters(convidados.value, colunas.value, acessores.value, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

// --- blocos recolhíveis ---
//
// Estado local, não na URL: recolher é ajuste de leitura do momento, e uma URL
// carregando a lista de blocos fechados ficaria ilegível sem ganhar nada — o
// que vale compartilhar é o recorte (que está na URL), não a dobra visual.
const recolhidos = ref<string[]>([])

function alternarBloco(id: string) {
  recolhidos.value = recolhidos.value.includes(id)
    ? recolhidos.value.filter((item) => item !== id)
    : [...recolhidos.value, id]
}

const secoes = computed(() =>
  montarSecoesDeConvidados(linhasFiltradas.value, grupos.value, {
    esconderVazios: filters.hasActive.value,
    recolhidos: recolhidos.value,
  }),
)

const todosRecolhidos = computed(
  () =>
    secoes.value.length > 0 && secoes.value.every((secao) => recolhidos.value.includes(secao.id)),
)

function alternarTodos() {
  recolhidos.value = todosRecolhidos.value ? [] : secoes.value.map((secao) => secao.id)
}

// --- resumo ---
//
// Descreve a lista inteira, nunca o recorte: "Resumo da lista" é o tamanho do
// casamento, e mudaria de significado se um filtro o encolhesse.
const metricas = computed(() => {
  const linhas: { label: string; value: number; tone?: 'primary' }[] = [
    { label: 'Convidados', value: convidados.value.length },
    { label: 'Confirmados', value: data.value?.confirmados ?? 0, tone: 'primary' },
  ]
  // Só entra quando existe: uma métrica "0 em consideração" ocuparia um quarto
  // da faixa para dizer que não há nada a dizer.
  if (data.value?.rascunhos.length) {
    linhas.push({ label: 'Em consideração', value: data.value.rascunhos.length })
  }
  return linhas
})

const faixasDoResumo = computed(() => {
  const totais = new Map<string, number>()
  for (const convidado of convidados.value) {
    const chave = faixaPorConvidado.value.get(convidado.id)?.chave ?? 'nao_informada'
    totais.set(chave, (totais.get(chave) ?? 0) + 1)
  }

  return [...totais.entries()]
    .map(([chave, total]) => ({
      chave,
      label:
        FAIXA_ETARIA_ROTULOS_PLURAL[chave as keyof typeof FAIXA_ETARIA_ROTULOS_PLURAL] ??
        'Não informada',
      total,
    }))
    .sort((a, b) => b.total - a.total)
})

const isFirstLoad = computed(() => status.value === 'pending' && !data.value)
const isRefreshing = computed(() => status.value === 'pending' && Boolean(data.value))

const metaDoCabecalho = computed(() => {
  const total = convidados.value.length
  const rascunho = data.value?.rascunhos.length ?? 0
  const base = `${total} ${total === 1 ? 'convidado' : 'convidados'}`
  return rascunho ? `${base} · ${rascunho} em consideração` : base
})

// --- criar/editar ---
//
// Mesma convenção da Visão organizada: o modal é governado pela URL
// (`?novo=1` / `?editar=<id>`), então link salvo, busca global e botão Voltar
// continuam funcionando.
const editingGuestId = computed(() =>
  typeof route.query.editar === 'string' ? route.query.editar : null,
)
const isGuestModalOpen = computed(() => route.query.novo === '1' || Boolean(editingGuestId.value))

function abrirNovoConvidado() {
  router.push({ query: { ...route.query, novo: '1', editar: undefined } })
}

function abrirEdicao(convidado: GuestListItem) {
  router.push({ query: { ...route.query, novo: undefined, editar: convidado.id } })
}

// replace, não push: fechar o modal não pode deixar um passo a mais no
// histórico.
function fecharModalDeConvidado() {
  router.replace({ query: { ...route.query, novo: undefined, editar: undefined } })
}

async function recarregarTudo() {
  await Promise.all([refresh(), refreshGrupos()])
}

const isImportModalOpen = ref(false)
const isTemplateModalOpen = ref(false)

const isExporting = ref(false)

// Exporta o MESMO recorte que a tabela mostra. Os filtros aqui são do client,
// então o que vai para o endpoint é a tradução deles — e `nome` é o único que
// o export aceita como texto livre.
async function exportar() {
  isExporting.value = true
  try {
    await exportGuests({ search: filters.valuesOf('nome')[0] || undefined })
  } finally {
    isExporting.value = false
  }
}

// --- excluir ---
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const deleteTarget = ref<GuestListItem | null>(null)

function abrirExclusao(convidado: GuestListItem) {
  deleteTarget.value = convidado
  isDeleteModalOpen.value = true
}

async function confirmarExclusao() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteGuest(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await recarregarTudo()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <!-- Duas colunas do `lg` pra cima: menu da seção e conteúdo; abaixo disso o
       menu vira fileira horizontal. Não há terceira coluna de resumo — com a
       navegação do admin, o menu da seção e uma tabela de oito colunas na
       mesma tela, ela espremia a tabela até as colunas saírem de vista. Os
       números foram para a faixa de métricas, sobre a tabela. -->
  <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
    <AdminGuestsGuestSectionNav :slug="slug" />

    <div class="min-w-0 flex-1">
      <AdminSection
        title="Lista de convidados"
        :meta="metaDoCabecalho"
        description="Monte e organize a lista inteira de uma vez, como numa planilha."
      >
        <template #actions>
          <UiInput
            v-model="searchDraft"
            icon="lucide:search"
            tone="muted"
            aria-label="Filtrar convidados por nome"
            placeholder="Filtrar por nome..."
            class="w-full sm:w-64"
          />
          <UiButton @click="abrirNovoConvidado">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar convidado
          </UiButton>
        </template>

        <UiSkeleton v-if="isFirstLoad" class="h-96 w-full" />

        <UiEmptyState
          v-else-if="error"
          icon="lucide:triangle-alert"
          title="Não foi possível carregar a lista"
          description="Tente novamente em alguns instantes."
        >
          <UiButton variant="outline" @click="recarregarTudo">Tentar novamente</UiButton>
        </UiEmptyState>

        <UiEmptyState
          v-else-if="!convidados.length"
          icon="lucide:users"
          title="A lista está vazia"
          description="Comece adicionando as primeiras pessoas, ou importe a planilha que você já tem."
        >
          <div class="flex flex-wrap items-center justify-center gap-2">
            <UiButton @click="abrirNovoConvidado">
              <Icon name="lucide:plus" class="h-4 w-4" />
              Adicionar convidado
            </UiButton>
            <UiButton variant="ghost" @click="isImportModalOpen = true">
              <Icon name="lucide:upload" class="h-4 w-4" />
              Importar planilha
            </UiButton>
          </div>
        </UiEmptyState>

        <template v-else>
          <!-- Os números descrevem a lista INTEIRA, não o recorte: "quantos
               convidados eu tenho" não muda porque um filtro está aplicado. O
               que o recorte descreve é o "N exibidas" do painel. -->
          <AdminMetricStrip :metrics="metricas" />

          <div v-if="faixasDoResumo.length" class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span
              v-for="faixa in faixasDoResumo"
              :key="faixa.chave"
              class="text-xs text-text-muted"
            >
              {{ faixa.label }}
              <span class="num ml-1 text-text">{{ faixa.total }}</span>
            </span>
          </div>

          <AdminPanel title="Pessoas" :meta="`${linhasFiltradas.length} exibidas`">
            <template #headerActions>
              <AdminTableFilterBar
                :columns="colunas"
                :filters="filters"
                group-label="Filtros da lista de convidados"
              />
              <!-- Dentro do painel porque depende da tabela logo abaixo, que é
                   onde o Design System põe esse tipo de controle. -->
              <UiButton variant="ghost" size="sm" @click="alternarTodos">
                <Icon
                  :name="todosRecolhidos ? 'lucide:unfold-vertical' : 'lucide:fold-vertical'"
                  class="h-4 w-4"
                />
                {{ todosRecolhidos ? 'Expandir' : 'Recolher' }}
              </UiButton>
              <UiButton variant="ghost" size="sm" :disabled="isExporting" @click="exportar">
                <Icon name="lucide:download" class="h-4 w-4" />
                {{ isExporting ? 'Exportando...' : 'Exportar' }}
              </UiButton>
            </template>

            <!-- A lista não some enquanto o recorte é aplicado: esmaece, para o
               cabeçalho (e o menu de filtro aberto nele) não ser desmontado. -->
            <div :class="isRefreshing && 'opacity-60 transition-brand'">
              <AdminTable
                :columns="colunas"
                :rows="linhasFiltradas"
                :sections="secoes"
                :collapsed-ids="recolhidos"
                :filters="filters"
                row-clickable
                empty-label="Nenhuma pessoa com esses filtros."
                @toggle-section="alternarBloco"
                @row-click="abrirEdicao"
              >
                <template #cell-nome="{ row }">
                  <button
                    type="button"
                    class="text-left font-medium text-text transition-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    @click="abrirEdicao(row)"
                  >
                    {{ row.nome_completo }}
                  </button>
                </template>

                <template #cell-nucleo="{ row }">
                  <span class="text-text-muted">{{ rotuloDeNucleo(row) }}</span>
                </template>

                <!-- Leitura nesta fase. A edição inline entra depois e vai gravar
                   `faixa_etaria_manual`, que só vale para quem não tem data de
                   nascimento — a faixa é sempre derivada (CLAUDE.md, seção 12).
                   O `title` diz de onde o valor saiu. -->
                <template #cell-faixa="{ row }">
                  <span class="text-text-muted" :title="faixaPorConvidado.get(row.id)?.title">
                    {{ faixaPorConvidado.get(row.id)?.label }}
                  </span>
                </template>

                <!-- Vinculado/sem convite, não o status de envio: `convidados`
                   sabe se há `convite_id`, mas "Enviado" mora em `convites` e
                   exigiria carregar a lista de convites junto. Este recorte já
                   responde o que se pergunta aqui — quem não está em convite
                   nenhum não pode responder RSVP. -->
                <template #cell-convite="{ row }">
                  <UiBadge :tone="row.convite_id ? 'neutral' : 'warning'">
                    {{ row.convite_id ? 'Vinculado' : 'Sem convite' }}
                  </UiBadge>
                </template>

                <template #cell-rsvp="{ row }">
                  <UiBadge :tone="rsvpStatusPresentation(row.status_rsvp).tone">
                    {{ rsvpStatusPresentation(row.status_rsvp).label }}
                  </UiBadge>
                </template>

                <template #cell-observacao="{ row }">
                  <span class="text-text-muted">{{ row.observacoes || '—' }}</span>
                </template>

                <template #cell-acoes="{ row }">
                  <AdminRowAction
                    icon="lucide:trash-2"
                    label="Excluir convidado"
                    tone="danger"
                    @click="abrirExclusao(row)"
                  />
                </template>
              </AdminTable>
            </div>
          </AdminPanel>

          <AdminGuestsGuestListDraftPanel v-if="data?.rascunhos.length" :pessoas="data.rascunhos" />
        </template>
      </AdminSection>
    </div>

    <AdminGuestsGuestPartyModal
      :model-value="isGuestModalOpen"
      :guest-id="editingGuestId"
      @update:model-value="(isOpen) => !isOpen && fecharModalDeConvidado()"
      @saved="recarregarTudo"
    />

    <AdminGuestsGuestImportModal
      v-model="isImportModalOpen"
      @imported="recarregarTudo"
      @request-template="isTemplateModalOpen = true"
    />

    <AdminGuestsGuestImportTemplateModal v-model="isTemplateModalOpen" />

    <UiModal v-model="isDeleteModalOpen" title="Excluir convidado">
      <p class="text-sm text-text-muted">
        {{ deleteTarget?.nome_completo }} sai da lista, mas o histórico de RSVP e presentes é
        preservado.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="isDeleteModalOpen = false">Cancelar</UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmarExclusao">
          {{ isDeleting ? 'Excluindo...' : 'Excluir' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
