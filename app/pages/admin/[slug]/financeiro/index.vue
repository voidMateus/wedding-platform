<!--
  Visão geral do Financeiro — a narrativa dos quatro estágios do dinheiro
  (docs/fase1-financeiro.md, seções 1.1 e 7).

  A tela responde, em ordem: quanto temos, em que pé está, o que precisa de nós
  agora, e onde isso está distribuído. Tudo que exige base para existir
  (percentual, estouro, teto) some quando não há base, em vez de aparecer
  zerado — um indicador sobre denominador vazio é pior que indicador nenhum.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`

const { getResumo, definirTetoDoOrcamento, criarCategoriasSugeridas } = useFinance()
const { data: resumo, status, error, refresh } = getResumo()

const toast = useToast()

const tetoAberto = ref(false)
const semeando = ref(false)

const naoDistribuido = computed(() => resumo.value?.naoDistribuido ?? null)

async function salvarTeto(valor: number | null) {
  try {
    await definirTetoDoOrcamento(valor)
    tetoAberto.value = false
    toast.success(valor === null ? 'Teto removido.' : 'Orçamento total atualizado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o orçamento total.'))
  }
}

async function comecarComSugeridas() {
  semeando.value = true
  try {
    const criadas = await criarCategoriasSugeridas()
    toast.success(`${criadas.length} categorias criadas.`)
    await navigateTo(`${base}/orcamento`)
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível criar as categorias.'))
  } finally {
    semeando.value = false
  }
}
</script>

<template>
  <AdminSection title="Financeiro" description="Quanto vai custar, quanto já saiu e o que vence.">
    <template #actions>
      <UiButton variant="outline" :to="`${base}/orcamento`">Abrir orçamento</UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar o Financeiro.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

    <template v-else-if="resumo">
      <UiEmptyState
        v-if="resumo.vazio"
        icon="lucide:wallet"
        title="Comece pelo orçamento"
        description="Crie as categorias do seu casamento e vá registrando o que for fechando. Dá para começar com as categorias que quase todo casamento tem — e mudar tudo depois."
      >
        <div class="flex flex-wrap justify-center gap-2">
          <UiButton :disabled="semeando" @click="comecarComSugeridas">
            Começar com as categorias sugeridas
          </UiButton>
          <UiButton variant="outline" :to="`${base}/orcamento`">Criar do zero</UiButton>
        </div>
      </UiEmptyState>

      <div v-else class="flex flex-col gap-6">
        <!-- Teto global: convite discreto quando não existe, nunca um zero. -->
        <AdminPanel>
          <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5"
          >
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
                Orçamento total
              </p>
              <p v-if="resumo.teto !== null" class="font-display text-3xl font-semibold text-text">
                {{ formatCentsToBRL(resumo.teto) }}
              </p>
              <p v-else class="mt-1 text-sm text-text-muted">
                Defina quanto vocês têm para gastar e acompanhe o quanto já tem destino.
              </p>
              <p v-if="naoDistribuido !== null" class="mt-1 text-xs text-text-muted">
                <template v-if="naoDistribuido > 0">
                  {{ formatCentsToBRL(resumo.planejado) }} distribuídos em categorias ·
                  {{ formatCentsToBRL(naoDistribuido) }} ainda sem destino
                </template>
                <template v-else-if="naoDistribuido < 0">
                  {{ formatCentsToBRL(Math.abs(naoDistribuido)) }} distribuídos além do total
                </template>
                <template v-else> Todo o orçamento já está distribuído. </template>
              </p>
            </div>
            <UiButton variant="outline" size="sm" @click="tetoAberto = true">
              {{ resumo.teto === null ? 'Definir' : 'Editar' }}
            </UiButton>
          </div>
        </AdminPanel>

        <AdminFinanceStageBoard :resumo="resumo" />

        <AdminFinanceAttentionBlock :resumo="resumo" :base="base" />

        <AdminFinanceCategoryTable :categorias="resumo.porCategoria" :base="base" />

        <!-- Entradas: leitura, em bloco separado. Não abate orçamento nenhum. -->
        <AdminPanel v-if="resumo.entradasPresentes.quantidade > 0">
          <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-4 sm:px-5"
          >
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
                Entradas — lista de presentes
              </p>
              <p class="mt-1 text-xs text-text-muted">
                Não abate o orçamento — é dinheiro que entrou, não despesa que saiu.
              </p>
            </div>
            <div class="flex items-baseline gap-3">
              <span class="font-display text-xl font-semibold tabular-nums text-text">
                {{ formatCentsToBRL(resumo.entradasPresentes.totalCentavos) }}
              </span>
              <NuxtLink
                :to="`/admin/${slug}/presentes`"
                class="text-xs text-text-muted hover:text-primary"
              >
                ver em Presentes
              </NuxtLink>
            </div>
          </div>
        </AdminPanel>
      </div>

      <AdminFinanceBudgetTotalModal
        v-model="tetoAberto"
        :teto-centavos="resumo.teto"
        :planejado-centavos="resumo.planejado"
        @salvar="salvarTeto"
      />
    </template>
  </AdminSection>
</template>
