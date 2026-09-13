<!--
  Cadastro de fornecedor: contato, estágio e COTAÇÃO.

  A cotação não entra em nenhum total — três buffets concorrentes na mesma
  categoria somariam três vezes o mesmo gasto. O compromisso de verdade é uma
  despesa, e o formulário diz isso em vez de deixar o casal descobrir depois.
-->
<script setup lang="ts">
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { EstagioFornecedor, VendorInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento, DespesaComParcelas, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  fornecedor?: FornecedorComSituacao | null
  categorias: CategoriaOrcamento[]
  /** Os gastos do orçamento — a cotação existe para um deles. */
  despesas: DespesaComParcelas[]
  despesaPadrao?: string | null
}

const {
  modelValue,
  fornecedor = null,
  categorias,
  despesas,
  despesaPadrao = null,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: VendorInput]
  /** O gasto que faltava, criado daqui mesmo — ver GASTO_NOVO. */
  criarGasto: [payload: { descricao: string; valorEstimadoCentavos: number | null }]
}>()

/**
 * O caminho para o gasto que ainda não existe.
 *
 * Sem ele, quem cadastra um fornecedor cujo gasto ninguém planejou precisa
 * fechar o modal, ir ao Orçamento, criar o gasto e voltar — perdendo tudo o
 * que já tinha digitado. O nome do fornecedor costuma ser a primeira coisa que
 * se sabe; o gasto, a segunda.
 */
const GASTO_NOVO = '__novo__'

const nome = ref('')
const despesaId = ref('')
const categoriaId = ref('')
const estagio = ref<EstagioFornecedor>('pesquisando')
const valorProposto = ref<number | null>(null)
const nomeContato = ref('')
const telefone = ref('')
const email = ref('')
const siteUrl = ref('')
const observacao = ref('')
const erro = ref('')

const editando = computed(() => Boolean(fornecedor))

const opcoesCategoria = computed(() => [
  { value: '', label: 'Sem categoria' },
  ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
])

/**
 * O gasto que esta cotação disputa. É ele que põe as propostas concorrentes
 * lado a lado na tela — sem isso, três fornecedores de refrigerante ficam
 * perdidos entre buffets e bandas.
 */
const opcoesDespesa = computed(() => [
  { value: '', label: 'Ainda não sei' },
  ...despesas.map((despesa) => ({
    value: despesa.id,
    label: despesa.categoria
      ? `${despesa.categoria.nome} · ${despesa.descricao}`
      : despesa.descricao,
  })),
  { value: GASTO_NOVO, label: '+ Criar um gasto novo' },
])

const criandoGasto = computed(() => despesaId.value === GASTO_NOVO)
const novoGastoDescricao = ref('')
const novoGastoEstimado = ref<number | null>(null)

const opcoesEstagio = ESTAGIOS_FORNECEDOR.map((valor) => ({
  value: valor,
  label: ROTULOS_ESTAGIO_FORNECEDOR[valor],
}))

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    nome.value = fornecedor?.nome ?? ''
    despesaId.value = fornecedor?.despesa_id ?? despesaPadrao ?? ''
    // A categoria vem do gasto quando há um: classificar duas vezes a mesma
    // coisa é como as duas acabam discordando.
    categoriaId.value =
      fornecedor?.categoria_id ??
      despesas.find((despesa) => despesa.id === (fornecedor?.despesa_id ?? despesaPadrao))
        ?.categoria_id ??
      ''
    estagio.value = (fornecedor?.estagio as EstagioFornecedor) ?? 'pesquisando'
    valorProposto.value = fornecedor?.valor_proposto_centavos ?? null
    nomeContato.value = fornecedor?.nome_contato ?? ''
    telefone.value = fornecedor?.telefone ?? ''
    email.value = fornecedor?.email ?? ''
    siteUrl.value = fornecedor?.site_url ?? ''
    observacao.value = fornecedor?.observacao ?? ''
    novoGastoDescricao.value = ''
    novoGastoEstimado.value = null
  },
)

/**
 * Cria o gasto e devolve o foco ao cadastro do fornecedor. Quem grava é a
 * página (o modal não fala com a API), e é ela que devolve o id pelo
 * `despesaPadrao` — por isso o campo volta para "Ainda não sei" aqui: se a
 * criação falhar, o formulário não fica apontando para um gasto inexistente.
 */
function criarGasto() {
  if (!novoGastoDescricao.value.trim()) {
    erro.value = 'Dê um nome ao gasto novo.'
    return
  }
  emit('criarGasto', {
    descricao: novoGastoDescricao.value.trim(),
    valorEstimadoCentavos: novoGastoEstimado.value,
  })
  novoGastoDescricao.value = ''
  novoGastoEstimado.value = null
  despesaId.value = ''
}

function submeter() {
  if (!nome.value.trim()) {
    erro.value = 'Informe o nome do fornecedor.'
    return
  }

  if (criandoGasto.value) {
    erro.value = 'Crie o gasto novo antes de salvar, ou escolha outro.'
    return
  }

  emit('salvar', {
    nome: nome.value.trim(),
    despesaId: despesaId.value || null,
    categoriaId: categoriaId.value || null,
    estagio: estagio.value,
    valorPropostoCentavos: valorProposto.value,
    nomeContato: nomeContato.value.trim() || null,
    telefone: telefone.value.trim() || null,
    email: email.value.trim(),
    siteUrl: siteUrl.value.trim(),
    observacao: observacao.value.trim() || null,
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="editando ? 'Editar fornecedor' : 'Novo fornecedor'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="nome" label="Nome" placeholder="Buffet Recanto" />
        <UiSelect
          v-model="despesaId"
          label="Cotação para"
          :options="opcoesDespesa"
          hint="O gasto que você está cotando — é o que agrupa as propostas."
        />
      </div>

      <!-- O gasto que ainda não existe nasce aqui, sem perder o que já foi
           digitado do fornecedor. -->
      <div
        v-if="criandoGasto"
        class="flex flex-col gap-3 rounded-lg border border-dashed border-border px-4 py-3"
      >
        <p class="text-sm text-text">Qual gasto este fornecedor vai cobrir?</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <UiInput v-model="novoGastoDescricao" label="Nome do gasto" placeholder="Refrigerantes" />
          <UiCurrencyInput v-model="novoGastoEstimado" label="Estimativa (opcional)" />
        </div>
        <div class="flex flex-wrap gap-2">
          <UiButton size="sm" variant="outline" @click="criarGasto">Criar gasto</UiButton>
          <UiButton size="sm" variant="ghost" @click="despesaId = ''">Cancelar</UiButton>
        </div>
      </div>

      <UiSelect
        v-if="!despesaId"
        v-model="categoriaId"
        label="Categoria"
        :options="opcoesCategoria"
        hint="Só enquanto o fornecedor não tem gasto definido."
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="estagio" label="Situação" :options="opcoesEstagio" />
        <UiCurrencyInput v-model="valorProposto" label="Cotação" />
      </div>

      <p class="text-xs text-text-muted">
        A cotação serve para comparar propostas — ela não entra no orçamento. O valor fechado vira
        uma despesa.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="nomeContato" label="Pessoa de contato" />
        <UiInput v-model="telefone" label="Telefone" type="tel" />
        <UiInput v-model="email" label="E-mail" type="email" />
        <UiInput v-model="siteUrl" label="Site" placeholder="https://" />
      </div>

      <UiTextarea v-model="observacao" label="Observação" :rows="2" />

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton @click="submeter">{{ editando ? 'Salvar' : 'Adicionar fornecedor' }}</UiButton>
    </template>
  </UiModal>
</template>
