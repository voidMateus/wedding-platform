<!--
  Os gastos de uma categoria, editáveis NO LUGAR.

  Existe porque planejar é um gesto repetido: o casal passa item a item
  perguntando "preciso disso? quanto?" — e fazer isso por um modal de cinco
  campos por vez cobra um pedágio a cada linha. Aqui o nome é um campo na
  própria linha e o valor é um campo ao lado: digita, Tab, pronto.

  Este é o único lugar do módulo onde um componente de domínio chama a própria
  mutação (CLAUDE.md, seção 9 permite quando é "self-contained"). O motivo é
  concreto: a edição no lugar precisa saber se o salvamento FALHOU para devolver
  o valor anterior ao campo — com o salvamento na página, o campo continuaria
  exibindo um número que o servidor recusou.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { CategoriaComDespesas, DespesaComParcelas } from '~/types/finance'

interface Props {
  categoria: CategoriaComDespesas
  /** Base do módulo (`/admin/<slug>/financeiro`) — destino da ficha. */
  base: string
}

const { categoria, base } = defineProps<Props>()

const toast = useToast()
const { criarDespesa, atualizarDespesa } = useFinance()

/**
 * O que está sendo digitado, por gasto.
 *
 * Sem isto, o refetch que toda mutação dispara jogaria fora o que o casal
 * acabou de escrever na linha vizinha — a mesma armadilha que a ficha do gasto
 * já tinha resolvido observando o id em vez do objeto.
 */
const rascunhos = ref<Record<string, { descricao: string; estimado: number | null }>>({})

/** A linha nova, ainda sem id. Nula quando ninguém pediu uma. */
const nova = ref<{ descricao: string; estimado: number | null } | null>(null)

function rascunho(despesa: DespesaComParcelas) {
  return (
    rascunhos.value[despesa.id] ?? {
      descricao: despesa.descricao,
      estimado: despesa.valor_estimado_centavos,
    }
  )
}

function editar(despesa: DespesaComParcelas, campo: 'descricao' | 'estimado', valor: unknown) {
  const atual = rascunho(despesa)
  rascunhos.value = {
    ...rascunhos.value,
    [despesa.id]: {
      ...atual,
      [campo]: campo === 'estimado' ? ((valor as number | undefined) ?? null) : String(valor),
    },
  }
}

/** Descarta o rascunho da linha — o valor volta a vir do servidor. */
function esquecer(id: string) {
  rascunhos.value = Object.fromEntries(
    Object.entries(rascunhos.value).filter(([chave]) => chave !== id),
  )
}

function mudou(despesa: DespesaComParcelas): boolean {
  const atual = rascunhos.value[despesa.id]
  if (!atual) return false
  return (
    atual.descricao.trim() !== despesa.descricao ||
    atual.estimado !== despesa.valor_estimado_centavos
  )
}

async function salvar(despesa: DespesaComParcelas) {
  if (!mudou(despesa)) return
  const atual = rascunhos.value[despesa.id]
  if (!atual) return

  // Nome vazio é engano de digitação, não intenção de apagar o gasto: o campo
  // volta ao que era. Excluir é ação explícita, na ficha.
  const descricao = atual.descricao.trim() || despesa.descricao

  try {
    // `?? 0` e não `null`: zero É um estado — "considerei e não vou ter", ou
    // "ainda não sei quanto". O schema exige que estimado ou fechado exista,
    // e mandar nulo nos dois deixaria o gasto sem nenhum valor declarado.
    await atualizarDespesa(despesa.id, {
      descricao,
      valorEstimadoCentavos: atual.estimado ?? 0,
    })
    esquecer(despesa.id)
  } catch (erro) {
    // O rascunho é descartado TAMBÉM no erro: manter no campo um número que o
    // servidor recusou é pior que voltar ao anterior, porque o casal continua
    // lendo como salvo.
    esquecer(despesa.id)
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o gasto.'))
  }
}

async function salvarNova() {
  const atual = nova.value
  if (!atual) return

  // Sair da linha sem escrever nada é desistir dela, não criar um gasto sem
  // nome — "+ adicionar" é barato de clicar por engano.
  if (!atual.descricao.trim()) {
    nova.value = null
    return
  }

  try {
    await criarDespesa({
      descricao: atual.descricao.trim(),
      valorEstimadoCentavos: atual.estimado ?? 0,
      categoriaId: categoria.categoriaId,
      valorCentavos: null,
      fornecedorId: null,
      observacao: null,
    })
    nova.value = null
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível criar o gasto.'))
  }
}

/**
 * Salva quando o foco deixa a LINHA, não o campo: passar do nome para o valor
 * é continuar na mesma linha, e salvar ali dispararia um refetch no meio da
 * digitação do casal.
 */
function aoSairDaLinha(evento: FocusEvent, acao: () => void) {
  const linha = evento.currentTarget as HTMLElement
  const proximo = evento.relatedTarget as Node | null
  if (proximo && linha.contains(proximo)) return
  acao()
}

function adicionar() {
  nova.value = { descricao: '', estimado: null }
}
</script>

<template>
  <div class="flex flex-col">
    <ul v-if="categoria.despesas.length > 0" class="flex flex-col">
      <li
        v-for="despesa in categoria.despesas"
        :key="despesa.id"
        class="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:gap-3"
        @focusout="aoSairDaLinha($event, () => salvar(despesa))"
        @keyup.enter="salvar(despesa)"
      >
        <UiInput
          class="min-w-0 flex-1"
          :model-value="rascunho(despesa).descricao"
          :aria-label="`Nome do gasto ${despesa.descricao}`"
          @update:model-value="editar(despesa, 'descricao', $event)"
        />

        <!-- Contratado não se estima mais: o número da linha passa a ser o que
             foi fechado, e ele não se digita aqui — vem da contratação. -->
        <p
          v-if="despesa.totais.contratado !== null"
          class="num flex h-10 items-center justify-end text-sm text-text sm:w-44"
        >
          {{ formatCentsToBRL(despesa.totais.contratado) }}
          <span class="ml-1.5 text-xs text-text-muted">contratado</span>
        </p>
        <UiCurrencyInput
          v-else
          class="sm:w-44"
          :model-value="rascunho(despesa).estimado"
          :aria-label="`Estimativa de ${despesa.descricao}`"
          @update:model-value="editar(despesa, 'estimado', $event)"
        />

        <AdminRowAction
          icon="lucide:arrow-right"
          :label="`Abrir ficha de ${despesa.descricao}`"
          :to="`${base}/gastos/${despesa.id}`"
        />
      </li>
    </ul>

    <!-- A linha nova é igual às outras de propósito: criar e editar são o mesmo
         gesto, e um formulário diferente para criar quebraria o ritmo. -->
    <div
      v-if="nova"
      class="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:gap-3"
      @focusout="aoSairDaLinha($event, salvarNova)"
      @keyup.enter="salvarNova"
    >
      <UiInput
        class="min-w-0 flex-1"
        :model-value="nova.descricao"
        aria-label="Nome do gasto novo"
        placeholder="O que vocês vão contratar?"
        autofocus
        @update:model-value="nova = { ...nova!, descricao: $event }"
      />
      <UiCurrencyInput
        class="sm:w-44"
        :model-value="nova.estimado"
        aria-label="Estimativa do gasto novo"
        @update:model-value="nova = { ...nova!, estimado: $event ?? null }"
      />
      <span class="hidden sm:block sm:w-8" aria-hidden="true" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
      <UiButton size="sm" variant="ghost" @click="adicionar">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar gasto
      </UiButton>
      <UiButton
        v-if="categoria.despesas.length > 0"
        size="sm"
        variant="ghost"
        :to="`${base}?categoria=${categoria.categoriaId ?? 'sem-categoria'}`"
      >
        Ver na lista de gastos
      </UiButton>
    </div>
  </div>
</template>
