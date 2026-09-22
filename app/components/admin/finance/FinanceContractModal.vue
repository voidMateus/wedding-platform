<!--
  Contratar: o momento em que a cotação vira compromisso.

  É a ponte entre as três telas. O casal escolhe a qual gasto PLANEJADO aquela
  proposta corresponde, confirma o valor fechado e diz como vai pagar — e, a
  partir daí, o gasto conta como contratado no Orçamento e as parcelas existem
  em Pagamentos.

  A lista oferece primeiro os gastos ainda sem valor fechado: contratar é
  justamente preencher um deles.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { RegistrarContratacaoInput } from '#shared/schemas/finance'
import type { DespesaComParcelas, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  fornecedor: FornecedorComSituacao | null
  despesas: DespesaComParcelas[]
  /** Gasto já escolhido — quando a contratação começa pela linha dele no Orçamento. */
  despesaPadrao?: string | null
}

const { modelValue, fornecedor, despesas, despesaPadrao = null } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  contratar: [input: RegistrarContratacaoInput]
  criarGasto: []
}>()

const despesaId = ref('')
const valor = ref<number | null>(null)
const erro = ref('')

/**
 * Com quem vocês fecharam.
 *
 * Campo de texto com sugestões, e não um seletor: a resposta certa é quase
 * sempre um fornecedor que ainda NÃO existe — quem fecha com o buffet sem ter
 * cadastrado cotação era exatamente o caso que ficava sem contraparte (ponto
 * 17). Uma lista fechada obrigaria a sair daqui, criar o fornecedor e voltar.
 *
 * O texto vira id quando bate com um nome que já existe, e vira fornecedor novo
 * quando não bate. Sem isso, contratar duas vezes com o mesmo nome criaria dois
 * fornecedores idênticos disputando o mesmo gasto.
 */
const { listVendors } = useVendors()
const { data: listaDeFornecedores } = listVendors()

const nomeDoFornecedor = ref('')

const fornecedoresAtivos = computed(() =>
  (listaDeFornecedores.value?.data ?? []).filter((atual) => !atual.excluido_em),
)

const nomesSugeridos = computed(() => fornecedoresAtivos.value.map((atual) => atual.nome))

/** Comparação sem caixa e sem espaço sobrando — "Buffet Leila" e "buffet leila" são um só. */
const fornecedorExistente = computed(() => {
  const alvo = nomeDoFornecedor.value.trim().toLocaleLowerCase('pt-BR')
  if (!alvo) return null
  return (
    fornecedoresAtivos.value.find(
      (atual) => atual.nome.trim().toLocaleLowerCase('pt-BR') === alvo,
    ) ?? null
  )
})

// O plano de pagamento (entrada + restante) vive no componente de campos, que
// é o mesmo usado em "Agendar pagamento". Aqui só guardamos o que ele produz.
const plano = ref<RegistrarContratacaoInput['parcelamento']>(undefined)
const planoPronto = ref(true)

/** Sem valor fechado primeiro: é o que se está contratando agora. */
const opcoesDespesa = computed(() => {
  const semContrato = despesas.filter((despesa) => despesa.valor_centavos === null)
  const comContrato = despesas.filter((despesa) => despesa.valor_centavos !== null)
  const rotular = (despesa: DespesaComParcelas) => {
    const categoria = despesa.categoria ? `${despesa.categoria.nome} · ` : ''
    const estimado =
      despesa.totais.estimado > 0 ? ` (${formatCentsToBRL(despesa.totais.estimado)})` : ''
    return { value: despesa.id, label: `${categoria}${despesa.descricao}${estimado}` }
  }
  return [...semContrato.map(rotular), ...comContrato.map(rotular)]
})

const despesaEscolhida = computed(() => despesas.find((despesa) => despesa.id === despesaId.value))

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    despesaId.value = despesaPadrao ?? ''
    // A cotação é a melhor sugestão de valor que existe — e continua editável,
    // porque o preço fechado costuma diferir da proposta.
    valor.value = fornecedor?.valor_proposto_centavos ?? null
    // Contratando A PARTIR de uma proposta, o nome já vem escrito: o atrito do
    // campo novo é só para quem fechou com quem ninguém cotou.
    nomeDoFornecedor.value = fornecedor?.nome ?? ''
  },
)

// Escolher o gasto sem valor sugere a estimativa dele quando não há cotação.
watch(despesaEscolhida, (despesa) => {
  if (valor.value === null && despesa) {
    valor.value = despesa.totais.estimado || null
  }
})

// Função nomeada: `@evento` no template é UMA expressão, e duas atribuições
// soltas ali viram erro de sintaxe que o typecheck não acusa.
function receberPlano(payload: {
  plano: RegistrarContratacaoInput['parcelamento']
  pronto: boolean
}) {
  plano.value = payload.plano
  planoPronto.value = payload.pronto
}

function submeter() {
  erro.value = ''
  if (!despesaId.value) {
    erro.value = 'Escolha a qual gasto esta contratação corresponde.'
    return
  }
  if (valor.value === null) {
    erro.value = 'Informe o valor fechado.'
    return
  }
  if (!nomeDoFornecedor.value.trim()) {
    erro.value = 'Informe com quem vocês fecharam.'
    return
  }
  if (!planoPronto.value) {
    erro.value = 'Complete os dados do pagamento.'
    return
  }

  const existente = fornecedorExistente.value

  emit('contratar', {
    despesaId: despesaId.value,
    valorCentavos: valor.value,
    parcelamento: plano.value,
    fornecedorId: existente?.id ?? null,
    fornecedorNome: existente ? undefined : nomeDoFornecedor.value.trim(),
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="fornecedor ? `Contratar ${fornecedor.nome}` : 'Registrar contratação'"
    description="O valor fechado entra no orçamento como custo real, e o pagamento passa a aparecer em Pagamentos."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <template v-if="opcoesDespesa.length > 0">
        <UiSelect
          v-model="despesaId"
          label="Qual gasto?"
          :options="opcoesDespesa"
          placeholder="Escolha o gasto planejado"
          hint="É o gasto do orçamento que esta contratação preenche."
        />
        <p
          v-if="despesaEscolhida && despesaEscolhida.valor_centavos !== null"
          class="-mt-2 text-xs text-warning"
        >
          Este gasto já tem valor fechado ({{ formatCentsToBRL(despesaEscolhida.valor_centavos) }})
          — contratar de novo substitui o valor e as parcelas em aberto.
        </p>
      </template>

      <div v-else class="rounded-lg border border-dashed border-border px-4 py-5 text-center">
        <p class="text-sm text-text">Nenhum gasto no orçamento ainda.</p>
        <p class="mt-1 text-xs text-text-muted">
          Contratar preenche um gasto planejado — crie o gasto primeiro.
        </p>
        <UiButton size="sm" variant="outline" class="mt-3" @click="emit('criarGasto')">
          Criar gasto
        </UiButton>
      </div>

      <template v-if="opcoesDespesa.length > 0">
        <UiInput
          v-model="nomeDoFornecedor"
          label="Com quem vocês fecharam?"
          placeholder="Nome do fornecedor"
          :suggestions="nomesSugeridos"
          :hint="
            fornecedorExistente
              ? 'Vai ficar vinculado a este fornecedor.'
              : 'Ainda não existe — será criado junto com a contratação.'
          "
        />

        <UiCurrencyInput v-model="valor" label="Valor fechado" />

        <AdminFinancePaymentPlanFields
          :total-centavos="valor ?? 0"
          :hoje="hojeNoFusoDoEvento()"
          :reiniciar="modelValue"
          @atualizar="receberPlano"
        />

        <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
      </template>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton v-if="opcoesDespesa.length > 0" @click="submeter">Confirmar contratação</UiButton>
    </template>
  </UiModal>
</template>
