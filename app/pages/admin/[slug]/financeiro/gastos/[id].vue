<!--
  A ficha do gasto — a história inteira de UM gasto, num lugar só.

  É o objeto do módulo ganhando endereço próprio. Antes ela era um modal aberto
  por cima da lista, e isso a condenava a ser um resumo: modal é para decisão
  curta, não para leitura demorada. Sendo rota, ela tem espaço para as quatro
  coisas que um gasto acumula (propostas, contrato, parcelas, documentos) e
  ainda para os próprios campos dele — que se editam AQUI, sem abrir mais nada
  por cima.

  Cadastro continua sem duplicar regra: cada ação chama a mesma mutação que a
  lista chamaria. O que mudou é que ler deixou de abrir diálogo.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import {
  ROTULOS_ESTAGIO_FORNECEDOR,
  type EstagioFornecedor,
  type TipoDocumento,
  type RegistrarContratacaoInput,
  type VendorInput,
} from '#shared/schemas/finance'
import type { DocumentoComVinculos, FornecedorComSituacao } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const toast = useToast()
const hoje = hojeNoFusoDoEvento()

const gastoId = computed(() => String(route.params.id))

const { getOrcamento, listCategorias, atualizarDespesa, excluirDespesa, registrarContratacao } =
  useFinance()
const { data: orcamento, status, error } = getOrcamento()
const { data: todasCategorias } = listCategorias()

const {
  listVendors,
  criarFornecedor,
  atualizarFornecedor,
  arquivarFornecedor,
  atualizarLista: atualizarFornecedores,
} = useVendors()
const { data: fornecedores } = listVendors()

const {
  listDocuments,
  criarDocumentoDeLink,
  enviarDocumento,
  excluirDocumento,
  obterUrlDoDocumento,
} = useFinanceDocuments()
const { data: documentos } = listDocuments()

const categorias = computed(() => orcamento.value?.categorias ?? [])
const todasDespesas = computed(() => categorias.value.flatMap((categoria) => categoria.despesas))

const despesa = computed(
  () => todasDespesas.value.find((atual) => atual.id === gastoId.value) ?? null,
)
const totais = computed(() => despesa.value?.totais ?? null)

const categoriasAtivas = computed(() =>
  (todasCategorias.value?.data ?? []).filter((categoria) => !categoria.excluido_em),
)

// --- propostas ---
const propostas = computed(() =>
  (fornecedores.value?.data ?? []).filter(
    (fornecedor) => !fornecedor.excluido_em && fornecedor.gasto?.id === gastoId.value,
  ),
)

const propostasArquivadas = computed(() =>
  (fornecedores.value?.data ?? [])
    .filter((fornecedor) => fornecedor.excluido_em && fornecedor.gasto?.id === gastoId.value)
    .map((fornecedor) => ({ id: fornecedor.id, nome: fornecedor.nome, detalhe: null })),
)

/** A menor proposta ancora a comparação — é a referência de "caro" e "barato". */
const menorProposta = computed(() => {
  const precos = propostas.value
    .map((fornecedor) => fornecedor.valor_proposto_centavos)
    .filter((valor): valor is number => typeof valor === 'number' && valor > 0)
  return precos.length > 0 ? Math.min(...precos) : null
})

const propostasOrdenadas = computed(() =>
  [...propostas.value].sort(
    (a, b) => (a.valor_proposto_centavos ?? Infinity) - (b.valor_proposto_centavos ?? Infinity),
  ),
)

// --- parcelas ---
const parcelas = computed(() =>
  [...(despesa.value?.parcelas ?? [])].sort((a, b) => a.vence_em.localeCompare(b.vence_em)),
)

const somaDasParcelas = computed(() =>
  parcelas.value.reduce((total, parcela) => total + parcela.valor_centavos, 0),
)

/**
 * A soma das parcelas contra o valor fechado.
 *
 * A regra do módulo permite que os dois divirjam nos dois sentidos — "entrada e
 * o resto a combinar" é o caso normal —, mas exige que a divergência seja
 * EXIBIDA. Ela não estava em tela nenhuma: dava para agendar parcelas somando o
 * dobro do contrato sem nada acusar.
 */
const divergencia = computed(() => {
  const contratado = totais.value?.contratado
  if (contratado === null || contratado === undefined || parcelas.value.length === 0) return null
  const diferenca = somaDasParcelas.value - contratado
  return diferenca === 0 ? null : diferenca
})

// --- documentos ---
const documentosDoGasto = computed(() => {
  const idsDePropostas = new Set(propostas.value.map((fornecedor) => fornecedor.id))
  return (documentos.value?.data ?? []).filter(
    (documento) =>
      documento.despesa_id === gastoId.value ||
      (documento.fornecedor_id && idsDePropostas.has(documento.fornecedor_id)),
  )
})

// --- edição dos campos do próprio gasto ---
const edicaoDescricao = ref('')
const edicaoCategoria = ref('')
const edicaoEstimado = ref<number | null>(null)
const edicaoObservacao = ref('')
const salvando = ref(false)

// Observa o ID, não o objeto: `orcamento` é refeito a cada mutação, e observar
// o objeto jogaria fora o que o casal está digitando a cada refetch.
watch(
  () => despesa.value?.id,
  () => {
    const atual = despesa.value
    if (!atual) return
    edicaoDescricao.value = atual.descricao
    edicaoCategoria.value = atual.categoria?.id ?? ''
    edicaoEstimado.value = atual.valor_estimado_centavos
    edicaoObservacao.value = atual.observacao ?? ''
  },
  { immediate: true },
)

const mudou = computed(() => {
  const atual = despesa.value
  if (!atual) return false
  return (
    edicaoDescricao.value !== atual.descricao ||
    edicaoCategoria.value !== (atual.categoria?.id ?? '') ||
    edicaoEstimado.value !== atual.valor_estimado_centavos ||
    edicaoObservacao.value !== (atual.observacao ?? '')
  )
})

async function salvarDetalhes() {
  if (!despesa.value || !mudou.value) return
  salvando.value = true
  try {
    await atualizarDespesa(despesa.value.id, {
      descricao: edicaoDescricao.value.trim(),
      categoriaId: edicaoCategoria.value || null,
      valorEstimadoCentavos: edicaoEstimado.value,
      observacao: edicaoObservacao.value.trim() || null,
    })
    toast.success('Gasto atualizado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o gasto.'))
  } finally {
    salvando.value = false
  }
}

// --- contratar ---
const contratoAberto = ref(false)
const fornecedorDoContrato = ref<FornecedorComSituacao | null>(null)

function abrirContratacao(fornecedor: FornecedorComSituacao | null) {
  fornecedorDoContrato.value = fornecedor
  contratoAberto.value = true
}

async function confirmarContratacao(input: RegistrarContratacaoInput) {
  try {
    // O fornecedor vem DENTRO do input: quem o escolheu foi a modal, que
    // pergunta "com quem vocês fecharam" desde o item C5.
    await registrarContratacao(input)
    // A lista de fornecedores tem cache próprio: sem este refresh a proposta
    // recém-contratada continuaria desenhada como "em análise" logo abaixo.
    await atualizarFornecedores()
    contratoAberto.value = false
    toast.success('Valor fechado registrado — o pagamento já está em Pagamentos.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível registrar a contratação.'))
  }
}

// --- fornecedor ---
const fornecedorModalAberto = ref(false)
const fornecedorEmEdicao = ref<FornecedorComSituacao | null>(null)

function novoFornecedor() {
  fornecedorEmEdicao.value = null
  fornecedorModalAberto.value = true
}

function editarFornecedor(fornecedor: FornecedorComSituacao) {
  fornecedorEmEdicao.value = fornecedor
  fornecedorModalAberto.value = true
}

async function salvarFornecedor(input: VendorInput) {
  try {
    if (fornecedorEmEdicao.value) {
      await atualizarFornecedor(fornecedorEmEdicao.value.id, input)
    } else {
      await criarFornecedor(input)
    }
    fornecedorModalAberto.value = false
    toast.success('Fornecedor salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o fornecedor.'))
  }
}

const paraArquivar = ref<FornecedorComSituacao | null>(null)
const desvinculando = ref(false)

/**
 * Os gastos do orçamento que apontam para este fornecedor.
 *
 * O servidor RECUSA arquivar enquanto existir algum — e recusava sem dizer
 * quais nem oferecer saída, num aviso que aparecia atrás da própria janela. A
 * janela mostra a lista e resolve o impedimento.
 */
const gastosVinculados = computed(() => {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return []
  return todasDespesas.value.filter((atual) => atual.fornecedor?.id === fornecedor.id)
})

/** Desfaz o vínculo e arquiva na sequência — o gasto continua intacto. */
async function desvincularEArquivar() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return

  desvinculando.value = true
  try {
    for (const atual of gastosVinculados.value) {
      await atualizarDespesa(atual.id, { fornecedorId: null })
    }
    await arquivarFornecedor(fornecedor.id, true)
    paraArquivar.value = null
    toast.success('Fornecedor arquivado. O gasto continuou no orçamento, agora sem ele.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível desvincular e arquivar.'))
  } finally {
    desvinculando.value = false
  }
}

async function confirmarArquivamento() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return
  try {
    await arquivarFornecedor(fornecedor.id, true)
    paraArquivar.value = null
    toast.success('Proposta arquivada. Dá para restaurar aqui mesmo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar a proposta.'))
  }
}

async function restaurarProposta(id: string) {
  try {
    await arquivarFornecedor(id, false)
    toast.success('Proposta restaurada.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível restaurar a proposta.'))
  }
}

// --- documentos ---
const documentoModalAberto = ref(false)
const documentoParaExcluir = ref<DocumentoComVinculos | null>(null)

async function abrirDocumento(documento: DocumentoComVinculos) {
  try {
    const { url } = await obterUrlDoDocumento(documento.id)
    window.open(url, '_blank', 'noopener')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível abrir o documento.'))
  }
}

async function salvarArquivo(payload: {
  arquivo: File
  titulo: string
  tipo: TipoDocumento
  fornecedorId: string | null
  despesaId: string | null
}) {
  try {
    await enviarDocumento(payload.arquivo, {
      titulo: payload.titulo,
      tipo: payload.tipo,
      fornecedorId: payload.fornecedorId,
      despesaId: payload.despesaId ?? gastoId.value,
    })
    documentoModalAberto.value = false
    toast.success('Documento enviado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível enviar o documento.'))
  }
}

async function salvarLink(payload: {
  titulo: string
  tipo: TipoDocumento
  urlExterna: string
  fornecedorId: string | null
  despesaId: string | null
}) {
  try {
    await criarDocumentoDeLink({ ...payload, despesaId: payload.despesaId ?? gastoId.value })
    documentoModalAberto.value = false
    toast.success('Documento salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o documento.'))
  }
}

async function confirmarExclusaoDeDocumento() {
  const documento = documentoParaExcluir.value
  if (!documento) return
  try {
    await excluirDocumento(documento.id)
    documentoParaExcluir.value = null
    toast.success('Documento excluído.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir o documento.'))
  }
}

// --- excluir o gasto ---
const confirmandoExclusao = ref(false)

async function confirmarExclusao() {
  if (!despesa.value) return
  try {
    await excluirDespesa(despesa.value.id)
    toast.success('Gasto excluído.')
    await navigateTo(base)
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir o gasto.'))
  }
}
</script>

<template>
  <AdminSection
    :title="despesa?.descricao ?? 'Gasto'"
    :meta="despesa?.categoria?.nome ?? undefined"
  >
    <template #actions>
      <UiButton variant="ghost" :to="base">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Todos os gastos
      </UiButton>
      <UiButton v-if="totais && totais.contratado === null" @click="abrirContratacao(null)">
        Registrar valor fechado
      </UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error || !despesa || !totais"
      icon="lucide:file-question"
      title="Gasto não encontrado"
      description="Ele pode ter sido excluído, ou o endereço está errado."
    >
      <UiButton :to="base">Voltar para os gastos</UiButton>
    </UiEmptyState>

    <template v-else>
      <!-- O dinheiro do gasto, nas mesmas três palavras do resto do módulo. A
           lista mostra UM número por linha; aqui, onde a pergunta é "como está
           isto?", os três cabem — e são exatamente três. -->
      <dl class="grid grid-cols-3 gap-px overflow-clip rounded-lg border border-border bg-border">
        <div class="bg-surface-elevated px-4 py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Estimado</dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ formatCentsToBRL(totais.estimado) }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-4 py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Contratado</dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ totais.contratado === null ? '—' : formatCentsToBRL(totais.contratado) }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-4 py-3">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Pago</dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ formatCentsToBRL(totais.pago) }}
          </dd>
        </div>
      </dl>

      <AdminPanel
        title="Propostas"
        :meta="`${propostas.length} ${propostas.length === 1 ? 'fornecedor' : 'fornecedores'}`"
      >
        <template #headerActions>
          <UiButton size="sm" variant="ghost" @click="novoFornecedor">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar fornecedor
          </UiButton>
        </template>

        <p v-if="propostas.length === 0" class="px-4 py-4 text-sm text-text-muted">
          Nenhum fornecedor cotando este gasto ainda.
        </p>

        <ul v-else class="flex flex-col divide-y divide-border">
          <li
            v-for="fornecedor in propostasOrdenadas"
            :key="fornecedor.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-text">{{ fornecedor.nome }}</p>
              <!-- Contato é para ser usado, não lido: vira discagem no
                   celular e cliente de e-mail no desktop. -->
              <a
                v-if="fornecedor.telefone || fornecedor.email"
                :href="
                  fornecedor.telefone ? `tel:${fornecedor.telefone}` : `mailto:${fornecedor.email}`
                "
                class="block truncate text-xs text-text-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {{ fornecedor.telefone || fornecedor.email }}
              </a>
            </div>

            <UiBadge
              v-if="menorProposta !== null && fornecedor.valor_proposto_centavos === menorProposta"
              tone="success"
            >
              menor
            </UiBadge>
            <UiBadge :tone="estagioFornecedorPresentation(fornecedor.estagio as never).tone">
              {{ ROTULOS_ESTAGIO_FORNECEDOR[fornecedor.estagio as EstagioFornecedor] }}
            </UiBadge>

            <span class="num text-sm text-text">
              {{
                fornecedor.valor_proposto_centavos
                  ? formatCentsToBRL(fornecedor.valor_proposto_centavos)
                  : '—'
              }}
            </span>

            <div class="flex items-center gap-1">
              <UiButton
                v-if="fornecedor.estagio !== 'descartado' && totais.contratado === null"
                size="sm"
                variant="outline"
                @click="abrirContratacao(fornecedor)"
              >
                Contratar
              </UiButton>
              <AdminRowAction
                icon="lucide:pencil"
                :label="`Editar ${fornecedor.nome}`"
                @click="editarFornecedor(fornecedor)"
              />
              <AdminRowAction
                icon="lucide:archive"
                :label="`Arquivar ${fornecedor.nome}`"
                @click="paraArquivar = fornecedor"
              />
            </div>
          </li>
        </ul>

        <div v-if="propostasArquivadas.length > 0" class="px-4 py-3">
          <AdminArchivedList
            :itens="propostasArquivadas"
            singular="proposta arquivada"
            plural="propostas arquivadas"
            @restaurar="restaurarProposta"
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Contrato">
        <div v-if="totais.contratado === null" class="flex flex-wrap items-center gap-3 px-4 py-4">
          <p class="flex-1 text-sm text-text-muted">
            Ainda é só planejamento — nada foi fechado para este gasto.
          </p>
          <UiButton size="sm" variant="outline" @click="abrirContratacao(null)">
            Registrar valor
          </UiButton>
        </div>

        <div v-else class="px-4 py-4 text-sm">
          <p class="text-text">
            Fechado por
            <span class="num font-semibold">{{ formatCentsToBRL(totais.contratado) }}</span>
            <template v-if="despesa.fornecedor"> com {{ despesa.fornecedor.nome }}</template>
          </p>
          <p
            v-if="totais.desvioDoEstimado !== null && totais.desvioDoEstimado !== 0"
            class="num mt-0.5"
            :class="totais.desvioDoEstimado < 0 ? 'text-success' : 'text-warning'"
          >
            {{ totais.desvioDoEstimado < 0 ? '−' : '+'
            }}{{ formatCentsToBRL(Math.abs(totais.desvioDoEstimado)) }}
            {{ totais.desvioDoEstimado < 0 ? 'de economia' : 'acima do estimado' }}
          </p>
        </div>
      </AdminPanel>

      <AdminPanel v-if="totais.contratado !== null" title="Pagamentos">
        <template #headerActions>
          <UiButton size="sm" variant="ghost" :to="`${base}/pagamentos`">
            Ver no calendário
          </UiButton>
        </template>

        <ul v-if="parcelas.length > 0" class="flex flex-col divide-y divide-border">
          <li
            v-for="parcela in parcelas"
            :key="parcela.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
          >
            <UiBadge :tone="situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).tone">
              {{ situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).label }}
            </UiBadge>
            <span class="num flex-1 text-sm text-text-muted">
              {{ formatarVencimento(parcela.vence_em, hoje) }}
              <span v-if="parcelas.length > 1" class="text-xs">· {{ parcela.numero }}ª</span>
            </span>
            <span class="num text-sm text-text">
              {{ formatCentsToBRL(parcela.valor_centavos) }}
            </span>
          </li>
        </ul>

        <div
          v-if="totais.naoParcelado > 0 || divergencia !== null"
          class="flex flex-col gap-1 px-4 py-3"
        >
          <p v-if="totais.naoParcelado > 0" class="text-sm text-warning">
            <span class="num font-medium">{{ formatCentsToBRL(totais.naoParcelado) }}</span>
            ainda sem data marcada.
          </p>
          <p v-if="divergencia !== null" class="text-sm text-warning">
            As parcelas somam
            <span class="num font-medium">{{ formatCentsToBRL(somaDasParcelas) }}</span>
            —
            <span class="num font-medium">{{ formatCentsToBRL(Math.abs(divergencia)) }}</span>
            {{ divergencia > 0 ? 'acima' : 'abaixo' }} do valor contratado.
          </p>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Documentos"
        :meta="`${documentosDoGasto.length} ${documentosDoGasto.length === 1 ? 'arquivo' : 'arquivos'}`"
      >
        <template #headerActions>
          <UiButton size="sm" variant="ghost" @click="documentoModalAberto = true">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar documento
          </UiButton>
        </template>

        <p v-if="documentosDoGasto.length === 0" class="px-4 py-4 text-sm text-text-muted">
          Nenhum contrato ou proposta anexado a este gasto.
        </p>

        <ul v-else class="flex flex-col divide-y divide-border">
          <li
            v-for="documento in documentosDoGasto"
            :key="documento.id"
            class="flex items-center gap-2 px-4 py-2.5"
          >
            <Icon
              :name="documento.url_externa ? 'lucide:link' : 'lucide:file-text'"
              class="h-4 w-4 shrink-0 text-text-muted"
            />
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="abrirDocumento(documento)"
            >
              {{ documento.titulo }}
            </button>
            <AdminRowAction
              icon="lucide:trash-2"
              :label="`Excluir ${documento.titulo}`"
              tone="danger"
              @click="documentoParaExcluir = documento"
            />
          </li>
        </ul>
      </AdminPanel>

      <!-- Os campos do próprio gasto, editáveis no lugar. Ficam por último de
           propósito: a pergunta de quem abre a ficha é "como está isto?", e só
           depois "quero mudar". -->
      <AdminPanel title="Detalhes">
        <form class="flex flex-col gap-4 px-4 py-4" @submit.prevent="salvarDetalhes">
          <div class="grid gap-4 sm:grid-cols-2">
            <UiInput v-model="edicaoDescricao" label="Nome do gasto" />
            <UiSelect
              v-model="edicaoCategoria"
              label="Categoria"
              :options="[
                { value: '', label: 'Sem categoria' },
                ...categoriasAtivas.map((categoria) => ({
                  value: categoria.id,
                  label: categoria.nome,
                })),
              ]"
            />
            <UiCurrencyInput v-model="edicaoEstimado" label="Valor estimado" />
          </div>

          <UiTextarea v-model="edicaoObservacao" label="Observação" :rows="2" />

          <div class="flex flex-wrap items-center justify-between gap-2">
            <UiButton variant="ghost" @click="confirmandoExclusao = true">
              <Icon name="lucide:trash-2" class="h-4 w-4" />
              Excluir gasto
            </UiButton>
            <UiButton type="submit" :disabled="!mudou || salvando">
              {{ salvando ? 'Salvando…' : 'Salvar alterações' }}
            </UiButton>
          </div>
        </form>
      </AdminPanel>

      <AdminFinanceContractModal
        v-model="contratoAberto"
        :fornecedor="fornecedorDoContrato"
        :despesas="todasDespesas"
        :despesa-padrao="gastoId"
        @contratar="confirmarContratacao"
      />

      <AdminFinanceVendorModal
        v-model="fornecedorModalAberto"
        :fornecedor="fornecedorEmEdicao"
        :categorias="categoriasAtivas"
        :despesas="todasDespesas"
        :despesa-padrao="gastoId"
        @salvar="salvarFornecedor"
      />

      <AdminFinanceDocumentModal
        v-model="documentoModalAberto"
        :fornecedores="propostas"
        :despesas="todasDespesas"
        :despesa-padrao="gastoId"
        @enviar-arquivo="salvarArquivo"
        @salvar-link="salvarLink"
      />

      <!-- O impedimento é dito ANTES do botão, não depois: o servidor recusa
           arquivar fornecedor ligado a um gasto, e sem isto a tela mandaria
           tentar para só então avisar. -->
      <UiModal
        :model-value="Boolean(paraArquivar)"
        title="Arquivar fornecedor"
        :description="`“${paraArquivar?.nome}” sai da lista. Dá para restaurar depois, e o histórico continua.`"
        @update:model-value="paraArquivar = null"
      >
        <div v-if="gastosVinculados.length > 0" class="flex flex-col gap-3">
          <div class="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <Icon name="lucide:link" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p class="text-sm text-text">
              Este fornecedor é o contratado de
              {{ gastosVinculados.length }}
              {{ gastosVinculados.length === 1 ? 'gasto' : 'gastos' }} do orçamento. Arquivar exige
              desfazer esse vínculo primeiro.
            </p>
          </div>

          <ul class="flex flex-col gap-1">
            <li
              v-for="vinculado in gastosVinculados"
              :key="vinculado.id"
              class="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md bg-surface-muted/60 px-3 py-2"
            >
              <span class="text-sm text-text">{{ vinculado.descricao }}</span>
              <span v-if="vinculado.totais.contratado !== null" class="num text-sm text-text-muted">
                {{ formatCentsToBRL(vinculado.totais.contratado) }}
              </span>
            </li>
          </ul>

          <p class="text-sm text-text-muted">
            O gasto continua no orçamento com o valor fechado e as parcelas — só deixa de apontar
            para este fornecedor.
          </p>
        </div>

        <template #footer>
          <UiButton variant="ghost" @click="paraArquivar = null">Cancelar</UiButton>
          <UiButton
            v-if="gastosVinculados.length > 0"
            variant="destructive"
            :disabled="desvinculando"
            @click="desvincularEArquivar"
          >
            {{ desvinculando ? 'Desvinculando…' : 'Desvincular e arquivar' }}
          </UiButton>
          <UiButton v-else variant="destructive" @click="confirmarArquivamento">Arquivar</UiButton>
        </template>
      </UiModal>

      <UiModal
        :model-value="Boolean(documentoParaExcluir)"
        title="Excluir documento"
        :description="`“${documentoParaExcluir?.titulo ?? ''}” será removido definitivamente.`"
        @update:model-value="documentoParaExcluir = null"
      >
        <template #footer>
          <UiButton variant="ghost" @click="documentoParaExcluir = null">Cancelar</UiButton>
          <UiButton variant="destructive" @click="confirmarExclusaoDeDocumento">Excluir</UiButton>
        </template>
      </UiModal>

      <UiModal
        v-model="confirmandoExclusao"
        title="Excluir gasto"
        :description="`“${despesa.descricao}” sai do orçamento, junto com as parcelas dele.`"
      >
        <template #footer>
          <UiButton variant="ghost" @click="confirmandoExclusao = false">Cancelar</UiButton>
          <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
        </template>
      </UiModal>
    </template>
  </AdminSection>
</template>
