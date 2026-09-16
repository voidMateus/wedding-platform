<script setup lang="ts">
import { diagnosticarPlataforma } from '#shared/diagnostico-da-plataforma'
import { formatarBytes } from '#shared/utils/bytes'
import { formatDatePtBR } from '#shared/utils/format-date'
import type { AdminRowMenuItem } from '~/components/admin/AdminRowMenu.vue'
import type { PlatformWeddingOverview } from '~/types/platform'
import type { AdminTableColumn } from '~/types/table'
import { getApiErrorMessage } from '~/utils/api-error'
import type { ClientColumn } from '~/utils/table-rows'

definePageMeta({ layout: 'plataforma' })

const toast = useToast()
const { getOverview, updateWedding } = usePlatformOverview()
const { data, status, error, refresh } = getOverview()

const criandoCasamento = ref(false)

const linhas = computed(() => data.value?.data ?? [])

const statusOptions = WEDDING_LIFECYCLE_VALUES.map((value) => ({
  value,
  label: weddingLifecyclePresentation(value).label,
}))

/**
 * O porte da plataforma, e o que cada casamento está fazendo nela.
 *
 * Eram quatro números, e um deles ("no ar, 12 de 16 eventos") deixava a
 * pergunta seguinte sem resposta: os outros quatro estão arquivados, ou são
 * gente que ainda não publicou? Os dois casos pedem ações opostas — um é
 * arquivo morto, o outro é cliente em planejamento —, então cada um vira uma
 * coluna própria. Os três estados somam o total, e é isso que torna a faixa
 * conferível de relance.
 *
 * Storage é medido no momento da leitura, nunca acumulado
 * (docs/fase5-multievento.md 8.2): não há série porque não há nada guardando
 * medição. Ele é o destaque por ser o único número aqui que representa custo.
 */
const metricas = computed(() => {
  const porStatus = (status: (typeof WEDDING_LIFECYCLE_VALUES)[number]) =>
    linhas.value.filter((linha) => linha.statusCicloVida === status).length

  return [
    { label: 'Casamentos', value: linhas.value.length },
    { label: 'Publicados', value: porStatus('publicado') },
    { label: 'Em planejamento', value: porStatus('rascunho') },
    { label: 'Arquivados', value: porStatus('arquivado') },
    {
      label: 'Convidados',
      value: linhas.value
        .reduce((soma, linha) => soma + linha.contagemConvidados, 0)
        .toLocaleString('pt-BR'),
    },
    {
      label: 'Storage',
      value: formatarBytes(data.value?.totais.storageBytes ?? 0),
      destaque: true,
    },
  ]
})

// --- o que precisa de atenção ---------------------------------------------
//
// As regras vivem em `shared/diagnostico-da-plataforma.ts`, puras e testadas.
// `hoje` local: a pergunta é de leitura da tela, não um cálculo de negócio com
// fuso do evento.
const hoje = new Date().toISOString().slice(0, 10)

const achados = computed(() =>
  diagnosticarPlataforma(
    linhas.value.map((linha) => ({
      id: linha.id,
      nomesNoivos: linha.nomesNoivos,
      statusCicloVida: linha.statusCicloVida,
      dataEvento: linha.dataEvento,
      createdAt: linha.createdAt,
      contagemConvidados: linha.contagemConvidados,
      temDono: linha.donoEmails.length > 0,
      ultimaAtividadeEm: linha.ultimaAtividadeEm,
    })),
    hoje,
  ),
)

/** O achado cujo recorte está aplicado — some sozinho quando ele deixa de existir. */
const achadoAtivo = ref<string | null>(null)

const recorteDoAchado = computed(() => {
  const achado = achados.value.find((item) => item.id === achadoAtivo.value)
  return achado ? new Set(achado.casamentos.map((casamento) => casamento.id)) : null
})

watch(achados, (lista) => {
  if (achadoAtivo.value && !lista.some((achado) => achado.id === achadoAtivo.value)) {
    achadoAtivo.value = null
  }
})

// --- a tabela --------------------------------------------------------------
//
// A visão da plataforma vem inteira numa requisição (é lista curta hoje, uma
// linha por casamento), então o recorte é aplicado no client. O dia em que ela
// for paginada, filtro e ordenação precisam virar parâmetro do endpoint — como
// já são em /api/guests —, senão passam a descrever só a página carregada.
const columns = computed<AdminTableColumn<PlatformWeddingOverview>[]>(() => [
  {
    key: 'casal',
    label: 'Casal',
    filter: { type: 'text', placeholder: 'Buscar casal ou endereço' },
    sort: 'alpha',
  },
  {
    key: 'status',
    label: 'Status',
    filter: { type: 'select', multiple: true, options: statusOptions },
  },
  { key: 'evento', label: 'Evento', align: 'right', sort: 'date' },
  { key: 'convidados', label: 'Convidados', align: 'right', sort: 'numeric' },
  { key: 'atividade', label: 'Atividade', align: 'right', sort: 'date' },
  { key: 'storage', label: 'Storage', align: 'right', sort: 'numeric' },
  { key: 'donos', label: 'Dono(s)', filter: { type: 'text', placeholder: 'Buscar e-mail' } },
  // "Criado em" saiu da lista e vive na ficha: numa tela de monitoramento, a
  // pergunta é "quando mexeram nisto pela última vez", não "quando entrou" — e
  // as duas colunas de data juntas empurravam o menu de ações para fora da
  // área visível, o que tira do alcance a única coluna que age.
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
])

const filters = useTableFilters(columns)

const accessors: Record<string, ClientColumn<PlatformWeddingOverview>> = {
  // O endereço entra na busca da mesma coluna: ele deixou de ter coluna própria
  // (vive sob o nome, que é onde se lê "quem é este casamento"), e sem isto a
  // equipe perderia a busca por slug, que é como um evento é identificado em
  // qualquer conversa de suporte.
  casal: {
    value: (row) => [row.nomesNoivos, row.slug],
    compare: compareText((row) => row.nomesNoivos),
  },
  status: { value: (row) => row.statusCicloVida },
  donos: { value: (row) => row.donoEmails },
  evento: { compare: compareText((row) => row.dataEvento) },
  convidados: { compare: compareNumber((row) => row.contagemConvidados) },
  // Nunca tocado ordena como o mais antigo de todos — que é exatamente o que
  // ele é, e o que quem ordena por atividade está procurando.
  atividade: {
    compare: compareNumber((row) =>
      row.ultimaAtividadeEm ? new Date(row.ultimaAtividadeEm).getTime() : 0,
    ),
  },
  storage: { compare: compareNumber((row) => row.storageBytes) },
}

const visibleWeddings = computed(() => {
  const filtradas = applyTableFilters(linhas.value, columns.value, accessors, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  })
  const recorte = recorteDoAchado.value
  return recorte ? filtradas.filter((linha) => recorte.has(linha.id)) : filtradas
})

/**
 * "12 de 16 casamentos" quando há recorte, "16 casamentos" quando não há.
 *
 * Era "16 exibidos", ao lado de uma métrica que já dizia "CASAMENTOS 16" — o
 * mesmo número duas vezes, e nenhuma das duas dizendo se algo estava filtrado.
 */
const metaDaLista = computed(() => {
  const exibidos = visibleWeddings.value.length
  const total = linhas.value.length
  const substantivo = total === 1 ? 'casamento' : 'casamentos'
  return exibidos === total ? `${total} ${substantivo}` : `${exibidos} de ${total} ${substantivo}`
})

/** "hoje", "há 3 dias", "nunca" — a distância importa mais que a data exata. */
function atividadeLabel(iso: string | null): string {
  if (!iso) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}

/**
 * Sem atividade recente, o texto deixa de ser cinza e passa a ser um sinal.
 *
 * `warning`, nunca `danger`: silêncio é um dado a olhar, não uma falha. O
 * vermelho desta tela é reservado ao que está de fato quebrado — um casamento
 * sem dono —, e gastá-lo numa coluna que fica amarela em metade das linhas o
 * faria parar de significar.
 */
function atividadeClasse(iso: string | null): string {
  if (!iso) return 'text-warning'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return dias >= 30 ? 'text-warning' : 'text-text-muted'
}

// --- ações de uma linha ----------------------------------------------------
//
// Menu, e não uma fileira de links: "Abrir" sozinho ocupava uma coluna inteira
// para oferecer o que a linha clicada já faz, e não havia onde pendurar o
// resto. A ação principal continua fora do menu — é a própria linha.
function acoesDaLinha(row: PlatformWeddingOverview): AdminRowMenuItem[] {
  const arquivado = row.statusCicloVida === 'arquivado'
  return [
    { key: 'gerenciar', label: 'Gerenciar', icon: 'lucide:settings' },
    { key: 'editar', label: 'Editar dados', icon: 'lucide:pencil' },
    {
      key: 'site',
      label: 'Ver site',
      icon: 'lucide:external-link',
      // Rascunho e arquivado respondem 404 no site público
      // (`garantirCasamentoPublicado`), então o item existe e explica por quê —
      // em vez de abrir uma aba com uma página de erro.
      disabled: row.statusCicloVida !== 'publicado',
      title:
        row.statusCicloVida !== 'publicado'
          ? 'O site só responde depois que o casal publica.'
          : undefined,
    },
    { key: 'copiar', label: 'Copiar link do site', icon: 'lucide:link' },
    {
      key: 'arquivar',
      label: arquivado ? 'Desarquivar' : 'Arquivar',
      icon: arquivado ? 'lucide:archive-restore' : 'lucide:archive',
      separarAntes: true,
    },
  ]
}

function linkDoSite(row: PlatformWeddingOverview): string {
  return `${window.location.origin}/${row.slug}`
}

async function executarAcao(row: PlatformWeddingOverview, chave: string) {
  if (chave === 'gerenciar') return navigateTo(`/plataforma/${row.id}`)
  // A ficha abre o formulário pela URL, no mesmo padrão de modal governado por
  // query que o resto do painel usa — e não por um estado que se perderia no
  // recarregar.
  if (chave === 'editar') return navigateTo(`/plataforma/${row.id}?editar=1`)
  if (chave === 'site') return window.open(linkDoSite(row), '_blank', 'noopener')

  if (chave === 'copiar') {
    try {
      await navigator.clipboard.writeText(linkDoSite(row))
      toast.success('Link copiado.')
    } catch {
      // Área de transferência bloqueada (permissão negada, contexto inseguro):
      // dizer "copiado" quando nada foi copiado é pior que admitir a falha.
      toast.error('Não foi possível copiar — o navegador bloqueou o acesso.')
    }
    return
  }

  if (chave === 'arquivar') {
    const arquivado = row.statusCicloVida === 'arquivado'
    try {
      await updateWedding(row.id, { statusCicloVida: arquivado ? 'rascunho' : 'arquivado' })
      toast.success(
        arquivado
          ? 'Desarquivado como rascunho — quem publica o site é o casal.'
          : 'Casamento arquivado.',
      )
      await refresh()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar o status.'))
    }
  }
}
</script>

<template>
  <AdminSection title="Casamentos" description="A visão entre contas da equipe da plataforma.">
    <template #actions>
      <UiButton @click="criandoCasamento = true">Criar casamento</UiButton>
    </template>

    <div v-if="status === 'pending'" class="flex flex-col gap-4">
      <UiSkeleton class="h-24 w-full" />
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar a visão da plataforma"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else>
      <div class="flex flex-col gap-2">
        <AdminMetricStrip :metrics="metricas" :colunas="6" />

        <!--
          A nota do Drive não é rodapé decorativo: sem ela, a equipe conclui que
          um casamento inteiro ocupa alguns MB. As fotos, que são o maior volume
          de qualquer casamento, vivem na conta do Google do casal — a galeria
          espelha a pasta dele e nunca copia.
        -->
        <p class="text-xs leading-relaxed text-text-muted">
          Storage conta capas, imagens de etapa do cronograma e documentos do Financeiro. Fotos de
          galeria ficam no Google Drive do casal e não entram nesta conta.
        </p>
      </div>

      <!-- O que pede um olhar, acima da tabela: quem abre esta tela quer saber
           se há algo errado antes de escolher uma linha. -->
      <PlatformAttentionPanel
        :achados="achados"
        :ativo="achadoAtivo"
        @selecionar="achadoAtivo = $event"
      />

      <!--
        AdminTable/AdminPanel aqui, e não uma casca própria: a mesa de trabalho
        da equipe da plataforma é uma listagem administrativa como as do painel
        do casal — mesmo cabeçalho fixo, mesmo menu de filtro por coluna.
      -->
      <AdminPanel :meta="metaDaLista">
        <template #headerActions>
          <UiButton v-if="achadoAtivo" size="sm" variant="ghost" @click="achadoAtivo = null">
            <Icon name="lucide:filter-x" class="h-4 w-4" />
            Limpar recorte
          </UiButton>
          <AdminTableFilterBar
            :columns="columns"
            :filters="filters"
            group-label="Filtros da lista de casamentos"
          />
        </template>

        <!--
          `:scrollable="false"`: a grade rolável dava duas barras de rolagem na
          mesma tela (a da página e a da tabela), e descobrir qual controla o
          quê é trabalho que ninguém deveria ter. Aqui a lista cresce e quem
          rola é o <main> do shell — o cabeçalho de colunas continua fixo,
          agora ancorado nele.
        -->
        <AdminTable
          :columns="columns"
          :rows="visibleWeddings"
          :filters="filters"
          :scrollable="false"
          row-clickable
          empty-label="Nenhum casamento com esses filtros."
          @row-click="navigateTo(`/plataforma/${$event.id}`)"
        >
          <template #cell-casal="{ row }">
            <div class="min-w-0">
              <NuxtLink
                :to="`/plataforma/${row.id}`"
                class="block truncate font-medium text-text transition-brand hover:text-primary"
                @click.stop
              >
                {{ row.nomesNoivos }}
              </NuxtLink>
              <span class="block truncate text-xs text-text-muted">/{{ row.slug }}</span>
            </div>
          </template>

          <template #cell-status="{ row }">
            <UiBadge :tone="weddingLifecyclePresentation(row.statusCicloVida).tone">
              {{ weddingLifecyclePresentation(row.statusCicloVida).label }}
            </UiBadge>
          </template>

          <template #cell-evento="{ row }">
            <span class="num text-text">{{ formatDatePtBR(row.dataEvento) }}</span>
          </template>

          <template #cell-convidados="{ row }">
            <span class="num text-text-muted">{{ row.contagemConvidados }}</span>
          </template>

          <template #cell-atividade="{ row }">
            <span
              :class="atividadeClasse(row.ultimaAtividadeEm)"
              :title="
                row.ultimaAtividadeEm
                  ? `Última ação do casal em ${formatDatePtBR(row.ultimaAtividadeEm)}`
                  : 'O casal nunca mexeu neste painel'
              "
            >
              {{ atividadeLabel(row.ultimaAtividadeEm) }}
            </span>
          </template>

          <template #cell-storage="{ row }">
            <span class="num text-text-muted">{{ formatarBytes(row.storageBytes) }}</span>
          </template>

          <template #cell-donos="{ row }">
            <!-- Truncado, com o endereço inteiro no `title`: e-mail de convite
                 de teste tem 40 caracteres, e a coluna empurrava as duas
                 seguintes para fora do painel. -->
            <span
              v-if="row.donoEmails.length"
              class="block max-w-36 truncate text-text-muted"
              :title="row.donoEmails.join(', ')"
            >
              {{ row.donoEmails.join(', ') }}
            </span>
            <!-- Sem dono é o achado mais grave do diagnóstico; na linha ele
                 precisa ler como falta, não como um travessão neutro. -->
            <span v-else class="text-danger">sem dono</span>
          </template>

          <template #cell-acoes="{ row }">
            <div class="flex items-center justify-end" @click.stop>
              <AdminRowMenu
                :items="acoesDaLinha(row)"
                :label="`Ações de ${row.nomesNoivos}`"
                @select="executarAcao(row, $event)"
              />
            </div>
          </template>
        </AdminTable>
      </AdminPanel>
    </template>

    <PlatformWeddingCreateModal v-model="criandoCasamento" @created="refresh()" />
  </AdminSection>
</template>
