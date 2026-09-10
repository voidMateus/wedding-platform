<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'
import type { FaixaEtariaChave } from '#shared/utils/faixa-etaria'
import type { GuestListItem } from '~/types/guest'
import { applyTableFilters } from '~/utils/table-rows'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const slug = useActiveWeddingSlug()
const toast = useToast()

const { deleteGuest, exportGuests, bulkUpdateGuests, groupGuestsAsParty, getGuestOverview } =
  useGuests()
const { listGroups } = useGroups()

// A lista INTEIRA, não uma página: o agrupamento em blocos e os contadores
// descrevem o conjunto, e nenhum dos dois é possível com 25 linhas na mão.
const { data, status, error, refresh } = useGuestListMode()
const { data: gruposData, refresh: refreshGrupos } = listGroups({ pageSize: 100 })
// Números da lista inteira, compartilhados com a Visão organizada pelo mesmo
// cabeçalho — ver GET /api/guests/overview.
const { data: overview, refresh: refreshOverview } = getGuestOverview()

const convidados = computed(() => data.value?.convidados ?? [])
const grupos = computed(() => gruposData.value?.data ?? [])

const { colunas, acessores, categorias, nomeDoGrupo, rotuloDeNucleo } = useGuestListModeColumns(
  convidados,
  grupos,
)

const filters = useTableFilters(colunas)

// A busca do cabeçalho e o filtro de texto da coluna "Nome" são o mesmo
// estado, com duas portas de entrada — nunca dois recortes que podem divergir.
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

/**
 * "41 exibidas · 18 confirmados" — sobre o RECORTE, não sobre a lista inteira.
 * A faixa de contadores ao lado descreve o total; este rótulo é o único lugar
 * que responde "e do que estou vendo agora, quantos já confirmaram?".
 *
 * Sem a fração "18/41" que os blocos usam: aqui o total já está dito em "41
 * exibidas", e repeti-lo no denominador seria o mesmo número duas vezes na
 * mesma linha.
 */
const rotuloDoPainel = computed(() => {
  const exibidas = linhasFiltradas.value.length
  const rotulo = `${exibidas} ${exibidas === 1 ? 'exibida' : 'exibidas'}`
  if (!exibidas) return rotulo
  const confirmados = linhasFiltradas.value.filter((row) => row.status_rsvp === 'confirmado').length
  return `${rotulo} · ${confirmados} confirmados`
})

/**
 * Opções do seletor de categoria de cada linha e da ação em massa.
 *
 * Vem de `useAgeGroups`, nunca do catálogo de faixas: esta lista era montada
 * aqui a partir de `FAIXA_ETARIA_CHAVES` e continuava oferecendo Adolescente e
 * Idoso depois de o casamento desligar as duas em Configurações. Duas listas em
 * paralelo para a mesma coisa é como uma delas fica errada sem nada acusar
 * (CLAUDE.md, seção 13).
 */
const { manualOptions: opcoesDeCategoriaManual } = useAgeGroups()

// --- blocos ---
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

// Com 150 convidados, abrir a lista inteira é uma parede de linhas: recolher
// tudo e abrir um bloco é como se trabalha um pedaço da lista por vez.
//
// `secoes` já omite a subdivisão de um pai recolhido, então recolher tudo e
// recalcular a partir dela converge: no primeiro clique entram pais e
// subdivisões visíveis; no seguinte, só os pais restam na lista e todos já
// estão marcados.
const tudoRecolhido = computed(
  () =>
    secoes.value.length > 0 && secoes.value.every((secao) => recolhidos.value.includes(secao.id)),
)

function alternarTudo() {
  recolhidos.value = tudoRecolhido.value ? [] : secoes.value.map((secao) => secao.id)
}

// --- seleção ---
const selecionados = ref<string[]>([])

function alternarSelecao(id: string) {
  selecionados.value = selecionados.value.includes(id)
    ? selecionados.value.filter((item) => item !== id)
    : [...selecionados.value, id]
}

const idsVisiveis = computed(() => linhasFiltradas.value.map((pessoa) => pessoa.id))
const todosSelecionados = computed(
  () =>
    idsVisiveis.value.length > 0 &&
    idsVisiveis.value.every((id) => selecionados.value.includes(id)),
)

function alternarTodos() {
  selecionados.value = todosSelecionados.value ? [] : [...idsVisiveis.value]
}

// Recorte novo, seleção antiga não descreve mais o que está na tela: manter
// marcado quem o filtro acabou de esconder faria a barra anunciar um número
// que não corresponde a nada visível — e a ação em massa atingiria gente fora
// de vista.
watch(idsVisiveis, (visiveis) => {
  selecionados.value = selecionados.value.filter((id) => visiveis.includes(id))
})

const aplicandoEmMassa = ref(false)

async function comLote(acao: () => Promise<unknown>, mensagem: (total: number) => string) {
  const total = selecionados.value.length
  aplicandoEmMassa.value = true
  try {
    await acao()
    selecionados.value = []
    await recarregarTudo()
    toast.success(mensagem(total))
  } catch (err) {
    // A mensagem do servidor, quando existe: agrupar recusa por motivos
    // específicos (convites diferentes, rascunho na seleção) e "não foi
    // possível" não diz o que fazer a respeito.
    const apiError = err as { data?: { message?: string } }
    toast.error(apiError.data?.message ?? 'Não foi possível aplicar a alteração.')
  } finally {
    aplicandoEmMassa.value = false
  }
}

function moverParaGrupo(grupoId: string) {
  return comLote(
    () => bulkUpdateGuests({ ids: selecionados.value, grupoId }),
    (total) => `${total} ${total === 1 ? 'convidado movido' : 'convidados movidos'}.`,
  )
}

function alterarCategoriaEmMassa(faixa: string) {
  return comLote(
    () =>
      bulkUpdateGuests({
        ids: selecionados.value,
        faixaEtariaManual: faixa as FaixaEtariaChave,
      }),
    (total) => `Categoria alterada em ${total}.`,
  )
}

// --- agrupar como acompanhantes ---
//
// A confirmação só aparece quando a operação faz MAIS do que a seleção diz:
// arrasta gente pelo núcleo, funde núcleos ou dá convite a quem não tinha.
// Agrupar duas pessoas soltas é inequívoco, e um diálogo ali seria um clique
// para confirmar exatamente o que se acabou de pedir.
const previaDoAgrupamento = computed(() =>
  montarPreviaDoAgrupamento(convidados.value, selecionados.value),
)

const precisaConfirmarAgrupamento = computed(() => {
  const previa = previaDoAgrupamento.value
  return (
    previa.convitesDiferentes ||
    previa.temRascunho ||
    previa.arrastados > 0 ||
    previa.nucleosFundidos > 0 ||
    previa.ganhamConvite > 0
  )
})

const impedimentoDoAgrupamento = computed(() => {
  const previa = previaDoAgrupamento.value
  if (previa.convitesDiferentes) {
    return 'Essas pessoas estão em convites diferentes. Acompanhantes vão sempre no mesmo convite — junte os convites antes, ou agrupe só quem já está no mesmo.'
  }
  if (previa.temRascunho) {
    return 'Quem está em consideração não entra em Acompanhantes — promova a convidado primeiro.'
  }
  return null
})

const isAgruparOpen = ref(false)

function pedirAgrupamento() {
  if (precisaConfirmarAgrupamento.value) {
    isAgruparOpen.value = true
    return
  }
  return agruparSelecionados()
}

function confirmarAgrupamento() {
  isAgruparOpen.value = false
  return agruparSelecionados()
}

function agruparSelecionados() {
  const previa = previaDoAgrupamento.value
  return comLote(
    () => groupGuestsAsParty({ ids: selecionados.value }),
    () => `${previa.total} pessoas agrupadas como acompanhantes.`,
  )
}

const isBulkDeleteOpen = ref(false)

function confirmarExclusaoEmMassa() {
  isBulkDeleteOpen.value = false
  return excluirSelecionados()
}

function excluirSelecionados() {
  return comLote(
    () => Promise.all(selecionados.value.map((id) => deleteGuest(id))),
    (total) => `${total} ${total === 1 ? 'convidado excluído' : 'convidados excluídos'}.`,
  )
}

// --- categoria inline ---
//
// Grava SÓ `faixa_etaria_manual`, e a célula fica travada para quem tem data de
// nascimento: a faixa é sempre derivada (CLAUDE.md, seção 12), e a manual perde
// para uma data válida. Um seletor destravado ali aceitaria a escolha e não
// mudaria nada na tela — o pior desfecho possível.
async function definirCategoria(convidado: GuestListItem, faixa: string) {
  try {
    await bulkUpdateGuests({
      ids: [convidado.id],
      faixaEtariaManual: (faixa || null) as FaixaEtariaChave | null,
    })
    await refresh()
  } catch {
    toast.error('Não foi possível alterar a categoria.')
  }
}

function categoriaTravada(convidado: GuestListItem): boolean {
  return Boolean(convidado.data_nascimento)
}

/**
 * Valor do seletor da linha: a faixa RESOLVIDA, não a que está gravada.
 *
 * As duas divergem quando o casamento desliga uma faixa: `faixa_etaria_manual`
 * continua "adolescente" — de propósito, desligar é configuração do evento e
 * não edição do cadastro das pessoas —, e a leitura resolve para a faixa que
 * herdou o território. Passando o valor cru, o seletor não achava a opção e
 * caía no placeholder, enquanto a coluna ao lado exibia a faixa herdada.
 */
function categoriaDaLinha(convidado: GuestListItem): string {
  const chave = categorias.value.get(convidado.id)?.chave
  return !chave || chave === FAIXA_ETARIA_NAO_INFORMADA ? '' : chave
}

const isFirstLoad = computed(() => status.value === 'pending' && !data.value)
const isRefreshing = computed(() => status.value === 'pending' && Boolean(data.value))

// --- criar/editar ---
const editingGuestId = computed(() =>
  typeof route.query.editar === 'string' ? route.query.editar : null,
)
const isGuestModalOpen = computed(() => route.query.novo === '1' || Boolean(editingGuestId.value))
const grupoInicial = computed(() =>
  typeof route.query.grupo === 'string' ? route.query.grupo : null,
)

function abrirNovoConvidado(grupoId?: string) {
  router.push({ query: { ...route.query, novo: '1', editar: undefined, grupo: grupoId } })
}

function abrirEdicao(convidado: GuestListItem) {
  router.push({
    query: { ...route.query, novo: undefined, grupo: undefined, editar: convidado.id },
  })
}

function fecharModalDeConvidado() {
  router.replace({
    query: { ...route.query, novo: undefined, editar: undefined, grupo: undefined },
  })
}

async function recarregarTudo() {
  await Promise.all([refresh(), refreshGrupos(), refreshOverview()])
}

/**
 * Recarga adiada da entrada rápida: quem está despejando nomes dispara um
 * cadastro por Enter, e recarregar a lista inteira a cada um deles seria uma
 * varredura de todas as páginas por nome digitado. O campo já dá o retorno
 * imediato ("N adicionados"), então a tabela pode chegar junto no fim da
 * rajada.
 */
const agendarRecarga = useDebounceFn(() => recarregarTudo(), 800)

/**
 * O bloco "Sem grupo" não é um grupo: o id dele é um marcador (`__sem-grupo__`),
 * não um uuid de `grupos`. Passá-lo adiante como grupo de destino mandaria um
 * valor que não existe no banco.
 */
function grupoDoBloco(sectionId: string): string | null {
  return sectionId === SECAO_SEM_GRUPO ? null : sectionId
}

const isImportModalOpen = ref(false)

/**
 * Qual entrada do importador abre expandida. "Colar do Excel" e "Importar" são
 * a MESMA operação com origens diferentes, então levam ao mesmo modal — o que
 * muda é onde o cursor cai. Abrir no seletor de arquivo depois de clicar em
 * "colar" seria entregar outra coisa.
 */
const modoDeImportacao = ref<'arquivo' | 'colar'>('arquivo')

function abrirColagem() {
  modoDeImportacao.value = 'colar'
  isImportModalOpen.value = true
}
const isTemplateModalOpen = ref(false)
const isExporting = ref(false)

async function exportar() {
  isExporting.value = true
  try {
    // Segue o recorte que a tabela mostra — o filtro de grupo agora vem do
    // menu do cabeçalho, e aceita mais de um valor.
    await exportGuests({
      search: filters.valuesOf('nome')[0] || undefined,
      groupId: filters.valuesOf('grupo').length ? filters.valuesOf('grupo') : undefined,
    })
  } finally {
    isExporting.value = false
  }
}

// --- excluir individual ---
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
  <!-- Sem coluna de apoio: nada divide a largura com a lista, e o recorte vive
       no menu de cada cabeçalho de coluna. O resumo que importa está na faixa
       de contadores, sobre a tabela. -->
  <div>
    <div class="flex min-w-0 flex-col gap-4">
      <AdminGuestsGuestListHeader
        :slug="slug"
        :busca="searchDraft"
        :exportando="isExporting"
        @update:busca="searchDraft = $event"
        @adicionar="abrirNovoConvidado()"
        @exportar="exportar"
        @colar="abrirColagem"
      />

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
          <UiButton @click="abrirNovoConvidado()">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar convidado
          </UiButton>
          <UiButton
            variant="ghost"
            @click="
              () => {
                modoDeImportacao = 'arquivo'
                isImportModalOpen = true
              }
            "
          >
            <Icon name="lucide:upload" class="h-4 w-4" />
            Importar planilha
          </UiButton>
        </div>
      </UiEmptyState>

      <template v-else>
        <!-- O título traz o "N exibidas": a faixa de contadores descreve a lista
             INTEIRA, então é aqui que o recorte se anuncia. -->
        <AdminPanel title="Pessoas" :meta="rotuloDoPainel">
          <template #headerActions>
            <AdminGuestsGuestListCounters
              :total="overview?.total ?? 0"
              :em-consideracao="overview?.emConsideracao ?? 0"
              :faixas="overview?.faixas ?? []"
              class="mr-auto"
            />

            <!-- No cabeçalho do painel porque depende da tabela logo abaixo,
                 que é onde o Design System põe esse tipo de controle. -->
            <UiButton variant="ghost" size="sm" @click="alternarTudo">
              <Icon
                :name="tudoRecolhido ? 'lucide:unfold-vertical' : 'lucide:fold-vertical'"
                class="h-4 w-4"
              />
              {{ tudoRecolhido ? 'Expandir tudo' : 'Recolher tudo' }}
            </UiButton>
          </template>

          <div :class="isRefreshing && 'opacity-60 transition-brand'">
            <AdminTable
              :columns="colunas"
              :rows="linhasFiltradas"
              :sections="secoes"
              :collapsed-ids="recolhidos"
              :filters="filters"
              empty-label="Nenhuma pessoa com esses filtros."
              row-clickable
              @toggle-section="alternarBloco"
              @row-click="abrirEdicao"
            >
              <template #cell-selecao="{ row }">
                <UiCheckbox
                  :model-value="selecionados.includes(row.id)"
                  :aria-label="`Selecionar ${row.nome_completo}`"
                  @update:model-value="alternarSelecao(row.id)"
                />
              </template>

              <template #cell-nome="{ row }">
                <button
                  type="button"
                  class="text-left font-medium text-text transition-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="abrirEdicao(row)"
                >
                  {{ row.nome_completo }}
                </button>
              </template>

              <!-- Texto, não chip: a pessoa já está DENTRO da faixa do grupo
                   dela, então o chip repetia em pílula, linha a linha, o que o
                   cabeçalho do bloco acabou de dizer — vinte e nove pílulas de
                   peso visual sem uma informação nova. A coluna continua aqui
                   (é ela que sustenta o filtro por grupo), só para de gritar. -->
              <template #cell-grupo="{ row }">
                <span class="block truncate text-text-muted" :title="nomeDoGrupo(row)">
                  {{ row.grupo_id ? nomeDoGrupo(row) : '—' }}
                </span>
              </template>

              <template #cell-nucleo="{ row }">
                <span class="text-text-muted">{{ rotuloDeNucleo(row) }}</span>
              </template>

              <template #cell-faixa="{ row }">
                <UiSelect
                  v-if="!categoriaTravada(row)"
                  :model-value="categoriaDaLinha(row)"
                  :options="opcoesDeCategoriaManual"
                  placeholder="—"
                  :aria-label="`Categoria de ${row.nome_completo}`"
                  variant="quiet"
                  class="w-32"
                  @update:model-value="definirCategoria(row, $event)"
                />
                <!-- Travada com data de nascimento: a faixa é calculada na data
                     do evento e a manual sempre perde. Um seletor aqui
                     aceitaria a escolha sem mudar nada. -->
                <span
                  v-else
                  class="flex items-center gap-1.5 text-text-muted"
                  :title="categorias.get(row.id)?.title"
                >
                  {{ categorias.get(row.id)?.label }}
                  <Icon name="lucide:lock" class="h-3 w-3 shrink-0" />
                </span>
              </template>

              <!-- Badge só na exceção. "Vinculado" é o estado normal de quase
                   toda linha, e destacá-lo em pílula gastava ênfase no
                   esperado — quem precisa ser visto de longe é quem ainda NÃO
                   tem convite. -->
              <template #cell-convite="{ row }">
                <!-- `whitespace-nowrap` pelo mesmo motivo do badge de RSVP:
                     "Sem convite" quebrava em duas linhas e engordava a linha
                     inteira. A coluna rola junto com a tabela se faltar
                     largura. -->
                <UiBadge v-if="!row.convite_id" tone="warning" class="whitespace-nowrap">
                  Sem convite
                </UiBadge>
                <span v-else class="text-xs text-text-muted">Vinculado</span>
              </template>

              <template #cell-rsvp="{ row }">
                <!-- `whitespace-nowrap`: "Não poderá ir" quebrava em duas
                     linhas e engordava a linha inteira, diferente das outras
                     telas. A coluna rola junto com a tabela se faltar largura. -->
                <UiBadge
                  :tone="rsvpStatusPresentation(row.status_rsvp).tone"
                  class="whitespace-nowrap"
                >
                  {{ rsvpStatusPresentation(row.status_rsvp).label }}
                </UiBadge>
              </template>

              <template #cell-observacao="{ row }">
                <span class="text-text-muted">{{ row.observacoes || '—' }}</span>
              </template>

              <!-- Só a lixeira. O lápis foi um terceiro caminho para o mesmo
                   formulário: o NOME já é um `<button>` que abre a edição — e é
                   ele o alvo acessível, porque `row-click` é conveniência de
                   mouse (uma `<tr>` não é focável nem anunciada como botão).
                   Três controles para uma ação, repetidos linha a linha, são
                   peso visual sem capacidade nova. -->
              <template #cell-acoes="{ row }">
                <AdminRowAction
                  icon="lucide:trash-2"
                  :label="`Excluir ${row.nome_completo}`"
                  tone="danger"
                  @click="abrirExclusao(row)"
                />
              </template>

              <!-- Linha do celular: nome dominante e o essencial em duas
                   linhas. O formato rótulo/valor automático faria de cada
                   pessoa um bloco de oito linhas. -->
              <template #stacked="{ row }">
                <div class="flex items-start gap-3 px-4 py-3">
                  <UiCheckbox
                    :model-value="selecionados.includes(row.id)"
                    :aria-label="`Selecionar ${row.nome_completo}`"
                    class="mt-0.5"
                    @update:model-value="alternarSelecao(row.id)"
                  />
                  <button
                    type="button"
                    class="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    @click="abrirEdicao(row)"
                  >
                    <span class="block truncate text-sm font-medium text-text">
                      {{ row.nome_completo }}
                    </span>
                    <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span class="text-text-muted">{{ categorias.get(row.id)?.label }}</span>
                      <span aria-hidden="true" class="text-text-muted">·</span>
                      <span class="text-text-muted">
                        {{ rsvpStatusPresentation(row.status_rsvp).label }}
                      </span>
                      <span v-if="!row.convite_id" class="text-warning">· sem convite</span>
                    </span>
                  </button>
                  <AdminRowAction
                    icon="lucide:trash-2"
                    label="Excluir convidado"
                    tone="danger"
                    @click="abrirExclusao(row)"
                  />
                </div>
              </template>

              <!-- Em TODO bloco, não só nas subdivisões e nos vazios como
                   antes: a entrada rápida é o caminho principal desta tela, e
                   um grupo-raiz com gente própria também recebe nomes. -->
              <template #section-footer="{ section }">
                <AdminGuestsGuestQuickAdd
                  :grupo-id="grupoDoBloco(section.id)"
                  :grupo-label="section.label"
                  @adicionado="agendarRecarga"
                  @abrir-cadastro="abrirNovoConvidado(grupoDoBloco(section.id) ?? undefined)"
                />
              </template>
            </AdminTable>
          </div>
        </AdminPanel>

        <AdminGuestsGuestListModeBulkBar
          :selecionados="selecionados.length"
          :grupos-disponiveis="montarOpcoesDeGrupo(grupos)"
          :categorias-disponiveis="opcoesDeCategoriaManual"
          :aplicando="aplicandoEmMassa"
          :todos-selecionados="todosSelecionados"
          @mover-para-grupo="moverParaGrupo"
          @alterar-categoria="alterarCategoriaEmMassa"
          @agrupar="pedirAgrupamento"
          @excluir="isBulkDeleteOpen = true"
          @limpar="selecionados = []"
          @alternar-todos="alternarTodos"
        />
      </template>
    </div>

    <AdminGuestsGuestPartyModal
      :model-value="isGuestModalOpen"
      :guest-id="editingGuestId"
      :initial-group-id="grupoInicial"
      @update:model-value="(isOpen) => !isOpen && fecharModalDeConvidado()"
      @saved="recarregarTudo"
    />

    <AdminGuestsGuestImportModal
      v-model="isImportModalOpen"
      :modo="modoDeImportacao"
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

    <!-- Só aparece quando agrupar faz mais do que a seleção diz. O texto conta
         cada efeito que o casal não pediu explicitamente, porque os dois que
         existem mexem em dado já compartilhado com convidado: o núcleo de
         alguém vem inteiro, e o convite passa a valer para quem não tinha. -->
    <UiModal v-model="isAgruparOpen" title="Agrupar como acompanhantes">
      <div class="flex flex-col gap-3 text-sm">
        <p v-if="impedimentoDoAgrupamento" class="text-danger">
          {{ impedimentoDoAgrupamento }}
        </p>

        <template v-else>
          <p class="text-text">
            <span class="num">{{ previaDoAgrupamento.total }}</span>
            pessoas ficam como acompanhantes, num grupo só.
          </p>
          <ul class="flex list-disc flex-col gap-1 pl-5 text-text-muted">
            <li v-if="previaDoAgrupamento.arrastados > 0">
              <span class="num">{{ previaDoAgrupamento.arrastados }}</span>
              {{ previaDoAgrupamento.arrastados === 1 ? 'entra' : 'entram' }} por já acompanhar
              alguém que você marcou — quem vem junto não fica atrás.
            </li>
            <li v-if="previaDoAgrupamento.nucleosFundidos > 0">
              <span class="num">{{ previaDoAgrupamento.nucleosFundidos }}</span>
              grupos de acompanhantes viram um.
            </li>
            <li v-if="previaDoAgrupamento.ganhamConvite > 0">
              <span class="num">{{ previaDoAgrupamento.ganhamConvite }}</span>
              {{ previaDoAgrupamento.ganhamConvite === 1 ? 'entra' : 'entram' }} no convite de quem
              já tinha, e com isso
              {{ previaDoAgrupamento.ganhamConvite === 1 ? 'passa' : 'passam' }}
              a poder responder ao RSVP.
            </li>
          </ul>
        </template>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="isAgruparOpen = false">
          {{ impedimentoDoAgrupamento ? 'Fechar' : 'Cancelar' }}
        </UiButton>
        <UiButton
          v-if="!impedimentoDoAgrupamento"
          :disabled="aplicandoEmMassa"
          @click="confirmarAgrupamento"
        >
          Agrupar
        </UiButton>
      </template>
    </UiModal>

    <UiModal v-model="isBulkDeleteOpen" title="Excluir selecionados">
      <p class="text-sm text-text-muted">
        {{ selecionados.length }}
        {{ selecionados.length === 1 ? 'pessoa sai' : 'pessoas saem' }} da lista. O histórico de
        RSVP e presentes é preservado.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="isBulkDeleteOpen = false">Cancelar</UiButton>
        <UiButton
          variant="destructive"
          :disabled="aplicandoEmMassa"
          @click="confirmarExclusaoEmMassa"
        >
          Excluir
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
