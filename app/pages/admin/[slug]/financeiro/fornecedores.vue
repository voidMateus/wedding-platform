<!--
  Fornecedores — uma tela de LEITURA, e só.

  A decisão original do módulo continua valendo para o cadastro: fornecedor não
  tem casa própria, ele nasce dentro da ficha do gasto que disputa, e é isso que
  garante que nenhuma cotação exista órfã e que todo gasto tenha onde pendurar a
  primeira proposta. Criar daqui reabriria a porta do fornecedor sem gasto.

  O que essa decisão não previu foi um caso de uso de LEITURA que o relatório
  trouxe (rodada de usabilidade de 20/09/2026, ponto 18): **passar a lista para
  a cerimonialista** — quem é o buffet, quem é o DJ, o telefone de cada um, no
  dia do evento. A ficha do gasto responde "quanto custou isto"; ninguém
  consegue montar dali uma lista de contatos sem abrir gasto por gasto.

  É o mesmo critério que o módulo já usa para admitir tela nova: eixo novo ou
  agregação. Aqui é agregação — os mesmos fornecedores somados por casamento.

  Por isso não há botão de criar, e há botão de imprimir.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import {
  gerarCsvDeFornecedores,
  nomeDoArquivoDeFornecedores,
} from '#shared/utils/exportacao-fornecedores'
import { baixarArquivo } from '~/utils/download'
import type { AdminTableColumn } from '~/types/table'
import type { FornecedorComSituacao } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`

const { listVendors } = useVendors()
const { data, status, error, refresh } = listVendors()

/**
 * Arquivado fica de fora: a lista existe para ser levada ao dia do evento, e
 * quem saiu da operação não está nele. A ficha do gasto continua sendo o lugar
 * de reencontrar uma proposta arquivada.
 */
const fornecedores = computed(() =>
  (data.value?.data ?? [])
    .filter((fornecedor) => !fornecedor.excluido_em)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
)

const ROTULOS_SITUACAO = {
  sem_despesa: { label: 'Sem gasto definido', tone: 'neutral' },
  a_pagar: { label: 'A pagar', tone: 'warning' },
  quitado: { label: 'Quitado', tone: 'success' },
} as const

const colunas = computed<AdminTableColumn<FornecedorComSituacao>[]>(() => [
  { key: 'nome', label: 'Fornecedor' },
  { key: 'gasto', label: 'Gasto' },
  { key: 'contato', label: 'Contato' },
  { key: 'contratado', label: 'Valor fechado', align: 'right' },
  { key: 'situacao', label: 'Situação' },
])

function exportar() {
  const csv = gerarCsvDeFornecedores(
    fornecedores.value.map((fornecedor) => ({
      nome: fornecedor.nome,
      gasto: fornecedor.gasto?.descricao ?? null,
      categoria: fornecedor.categoria?.nome ?? null,
      nomeContato: fornecedor.nome_contato,
      telefone: fornecedor.telefone,
      email: fornecedor.email,
      contratadoCentavos: fornecedor.contratadoCentavos,
      aPagarCentavos: fornecedor.aPagarCentavos,
      situacaoFinanceira: fornecedor.situacaoFinanceira,
    })),
  )

  baixarArquivo(csv, nomeDoArquivoDeFornecedores(new Date()))
}
</script>

<template>
  <AdminSection
    title="Fornecedores"
    description="Quem cuida de quê, com o contato de cada um."
    :meta="`${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'}`"
  >
    <template #actions>
      <AdminPrintButton label="Imprimir lista" :disabled="fornecedores.length === 0" />
      <UiButton variant="ghost" :disabled="fornecedores.length === 0" @click="exportar">
        <Icon name="lucide:download" class="h-4 w-4" />
        Exportar
      </UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar os fornecedores"
      description="Tente novamente em alguns instantes."
    >
      <UiButton variant="outline" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <!-- O estado vazio manda para os GASTOS, não para um formulário: é lá que o
         fornecedor nasce, dentro da ficha do que ele cota. -->
    <UiEmptyState
      v-else-if="fornecedores.length === 0"
      icon="lucide:contact"
      title="Nenhum fornecedor ainda"
      description="Fornecedor entra como proposta dentro da ficha de um gasto — é o que garante que nenhuma cotação fique solta."
    >
      <UiButton :to="base">Ir para os gastos</UiButton>
    </UiEmptyState>

    <AdminPanel v-else title="Quem vai atender o casamento">
      <AdminTable :columns="colunas" :rows="fornecedores" :scrollable="false">
        <template #cell-nome="{ row }">
          <span class="font-medium text-text">{{ row.nome }}</span>
          <span v-if="row.categoria" class="block text-xs text-text-muted">
            {{ row.categoria.nome }}
          </span>
        </template>

        <template #cell-gasto="{ row }">
          <NuxtLink
            v-if="row.gasto"
            :to="`${base}/gastos/${row.gasto.id}`"
            class="text-sm text-text underline-offset-2 hover:underline"
          >
            {{ row.gasto.descricao }}
          </NuxtLink>
          <span v-else class="text-sm text-text-muted">—</span>
        </template>

        <!-- Telefone e e-mail um sobre o outro: é a coluna que a cerimonialista
             usa no dia, e ela lê nome e número juntos. -->
        <template #cell-contato="{ row }">
          <span v-if="row.nome_contato" class="block text-sm text-text">{{
            row.nome_contato
          }}</span>
          <span v-if="row.telefone" class="num block text-sm text-text-muted">
            {{ row.telefone }}
          </span>
          <span v-if="row.email" class="block text-xs break-all text-text-muted">
            {{ row.email }}
          </span>
          <span
            v-if="!row.nome_contato && !row.telefone && !row.email"
            class="text-sm text-text-muted"
          >
            —
          </span>
        </template>

        <template #cell-contratado="{ row }">
          <span class="num text-sm text-text">
            {{ row.contratadoCentavos > 0 ? formatCentsToBRL(row.contratadoCentavos) : '—' }}
          </span>
          <span v-if="row.aPagarCentavos > 0" class="num block text-xs text-text-muted">
            falta {{ formatCentsToBRL(row.aPagarCentavos) }}
          </span>
        </template>

        <template #cell-situacao="{ row }">
          <UiBadge :tone="ROTULOS_SITUACAO[row.situacaoFinanceira].tone">
            {{ ROTULOS_SITUACAO[row.situacaoFinanceira].label }}
          </UiBadge>
        </template>
      </AdminTable>
    </AdminPanel>
  </AdminSection>
</template>
