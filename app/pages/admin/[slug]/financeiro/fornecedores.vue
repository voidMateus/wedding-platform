<!--
  Fornecedores: contato, estágio da negociação e a situação financeira
  DERIVADA das despesas ligadas a cada um.

  São duas colunas de estado diferentes de propósito. O estágio é escolha do
  casal ("estamos negociando"); a situação financeira é consequência dos fatos
  ("ainda devemos R$ 12.000"). Fundir as duas obrigaria alguém a lembrar de
  marcar "pago" — e a lista mentiria no dia em que esquecessem.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { EstagioFornecedor, VendorInput } from '#shared/schemas/finance'
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { FornecedorComSituacao } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const toast = useToast()
const { listVendors, criarFornecedor, atualizarFornecedor, excluirFornecedor } = useVendors()
const { data, status, error, refresh } = listVendors()
const { listCategorias } = useFinance()
const { data: categorias } = listCategorias()

const filtroEstagio = ref<EstagioFornecedor | ''>('')

const fornecedores = computed(() => {
  const lista = data.value?.data ?? []
  return filtroEstagio.value
    ? lista.filter((fornecedor) => fornecedor.estagio === filtroEstagio.value)
    : lista
})

const modalAberto = ref(false)
const emEdicao = ref<FornecedorComSituacao | null>(null)
const paraArquivar = ref<FornecedorComSituacao | null>(null)

function novoFornecedor() {
  emEdicao.value = null
  modalAberto.value = true
}

function editar(fornecedor: FornecedorComSituacao) {
  emEdicao.value = fornecedor
  modalAberto.value = true
}

async function salvar(input: VendorInput) {
  try {
    if (emEdicao.value) {
      await atualizarFornecedor(emEdicao.value.id, input)
    } else {
      await criarFornecedor(input)
    }
    modalAberto.value = false
    toast.success('Fornecedor salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o fornecedor.'))
  }
}

async function confirmarArquivamento() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return
  try {
    await excluirFornecedor(fornecedor.id)
    paraArquivar.value = null
    toast.success('Fornecedor arquivado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar o fornecedor.'))
  }
}

/** Link de WhatsApp: só dígitos, com o 55 quando o casal digitou só o DDD. */
function linkWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`
}
</script>

<template>
  <AdminSection
    title="Fornecedores"
    description="Quem você está pesquisando, negociando e já contratou."
    :meta="`${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'}`"
  >
    <template #actions>
      <UiButton @click="novoFornecedor">Novo fornecedor</UiButton>
    </template>

    <div class="flex flex-wrap gap-2">
      <UiChip
        label="Todos"
        clickable
        :selected="filtroEstagio === ''"
        @click="filtroEstagio = ''"
      />
      <UiChip
        v-for="estagio in ESTAGIOS_FORNECEDOR"
        :key="estagio"
        :label="ROTULOS_ESTAGIO_FORNECEDOR[estagio]"
        clickable
        :selected="filtroEstagio === estagio"
        @click="filtroEstagio = estagio"
      />
    </div>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar os fornecedores.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

    <UiEmptyState
      v-else-if="fornecedores.length === 0"
      icon="lucide:store"
      title="Nenhum fornecedor por aqui"
      description="Cadastre quem você está cotando — a proposta fica registrada sem virar despesa."
    >
      <UiButton @click="novoFornecedor">Novo fornecedor</UiButton>
    </UiEmptyState>

    <AdminPanel v-else>
      <ul class="divide-y divide-border">
        <li
          v-for="fornecedor in fornecedores"
          :key="fornecedor.id"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="truncate text-sm font-medium text-text">{{ fornecedor.nome }}</span>
              <span v-if="fornecedor.categoria" class="text-xs text-text-muted">
                {{ fornecedor.categoria.nome }}
              </span>
            </div>
            <p v-if="fornecedor.nome_contato" class="truncate text-xs text-text-muted">
              {{ fornecedor.nome_contato }}
            </p>
          </div>

          <UiBadge :tone="estagioFornecedorPresentation(fornecedor.estagio as never).tone">
            {{ estagioFornecedorPresentation(fornecedor.estagio as never).label }}
          </UiBadge>

          <div class="text-right text-sm tabular-nums">
            <p v-if="fornecedor.contratadoCentavos > 0" class="text-text">
              {{ formatCentsToBRL(fornecedor.contratadoCentavos) }}
            </p>
            <p v-else-if="fornecedor.valor_proposto_centavos" class="text-text-muted">
              {{ formatCentsToBRL(fornecedor.valor_proposto_centavos) }}
              <span class="text-xs">cotado</span>
            </p>
            <p class="text-xs text-text-muted">
              {{ situacaoFornecedorPresentation(fornecedor.situacaoFinanceira).label }}
              <template v-if="fornecedor.aPagarCentavos > 0">
                · {{ formatCentsToBRL(fornecedor.aPagarCentavos) }}
              </template>
            </p>
          </div>

          <div class="flex items-center gap-1">
            <AdminRowAction
              v-if="linkWhatsApp(fornecedor.telefone)"
              icon="lucide:message-circle"
              label="Abrir conversa no WhatsApp"
              :to="linkWhatsApp(fornecedor.telefone) ?? undefined"
            />
            <AdminRowAction
              v-if="fornecedor.email"
              icon="lucide:mail"
              label="Enviar e-mail"
              :to="`mailto:${fornecedor.email}`"
            />
            <AdminRowAction icon="lucide:pencil" label="Editar" @click="editar(fornecedor)" />
            <AdminRowAction
              icon="lucide:archive"
              label="Arquivar"
              @click="paraArquivar = fornecedor"
            />
          </div>
        </li>
      </ul>
    </AdminPanel>

    <AdminFinanceVendorModal
      v-model="modalAberto"
      :fornecedor="emEdicao"
      :categorias="categorias?.data ?? []"
      @salvar="salvar"
    />

    <UiModal
      :model-value="Boolean(paraArquivar)"
      title="Arquivar fornecedor"
      :description="`“${paraArquivar?.nome}” sai da lista. O histórico das despesas continua.`"
      @update:model-value="paraArquivar = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="paraArquivar = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarArquivamento">Arquivar</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
