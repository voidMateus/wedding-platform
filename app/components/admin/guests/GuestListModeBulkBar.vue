<!--
  A barra de ações em massa, no mesmo molde da barra de salvar de Configurações
  (`AdminSettingsSaveBar`): só aparece quando há algo a fazer, acompanha a
  rolagem e é o último filho do contêiner — a posição estática já é o fim da
  lista, e o sticky só a puxa para cima enquanto o fim ainda está abaixo do
  viewport.

  Só com seleção, e não permanente: uma barra com quatro ações desabilitadas
  ocupa a base da tela sem oferecer nada, e no celular rouba duas fileiras de
  lista. O "selecionar todos" mora dentro dela — depois da primeira marcação,
  que é quando ele passa a ter sentido.

  NO CELULAR a barra é uma linha só: contagem e um botão que abre as ações num
  modal. Em fileira, os quatro controles embrulhavam um por linha, os seletores
  truncavam o próprio rótulo ("Mover para gru...") e o bloco inteiro cobria a
  lista que se está selecionando. É a mesma saída que `AdminTableFilterBar` já
  usa para os filtros abaixo de `md`: controle que não cabe na largura vira um
  modal com o mesmo conteúdo, nunca um segundo conjunto de controles.

  `bottom-24` abaixo de `lg`, e não `bottom-4`: ali existe a barra de abas
  (`AdminBottomTabs`, `fixed bottom-0 z-30`), e com 4 de folga a barra colava
  ATRÁS dela. 24 é a mesma folga que o `<main>` já reserva em `pb-24` para
  liberar as abas.

  Depende de nenhum ancestral ser contêiner de rolagem entre ela e o `<main>`:
  ver a nota sobre `overflow-x` em `app/assets/css/main.css`, e o
  `overflow-clip` (nunca `hidden`) de `AdminPanel`.
-->
<script setup lang="ts">
interface OpcaoDeDestino {
  value: string
  label: string
}

interface Props {
  selecionados: number
  // Não `readonly`: `UiSelect` declara `options: SelectOption[]` mutável.
  gruposDisponiveis: OpcaoDeDestino[]
  categoriasDisponiveis: OpcaoDeDestino[]
  aplicando?: boolean
  /** Marcada quando tudo que está exibido já está selecionado. */
  todosSelecionados: boolean
}

const {
  selecionados,
  gruposDisponiveis,
  categoriasDisponiveis,
  aplicando = false,
  todosSelecionados,
} = defineProps<Props>()

const emit = defineEmits<{
  'mover-para-grupo': [grupoId: string]
  'alterar-categoria': [faixa: string]
  agrupar: []
  excluir: []
  limpar: []
  'alternar-todos': []
}>()

const acoesAbertas = ref(false)

const rotuloDaContagem = computed(
  () => `${selecionados} ${selecionados === 1 ? 'selecionado' : 'selecionados'}`,
)

/** Fecha o modal ao disparar: a ação foi escolhida, o painel não tem mais o que oferecer. */
function moverParaGrupo(grupoId: string) {
  acoesAbertas.value = false
  emit('mover-para-grupo', grupoId)
}

function alterarCategoria(faixa: string) {
  acoesAbertas.value = false
  emit('alterar-categoria', faixa)
}

function agrupar() {
  acoesAbertas.value = false
  emit('agrupar')
}

function excluir() {
  acoesAbertas.value = false
  emit('excluir')
}
</script>

<template>
  <Transition
    enter-active-class="transition-brand"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-brand"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="selecionados > 0"
      class="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-surface-elevated/95 px-3 py-3 shadow-lg backdrop-blur sm:px-4 lg:bottom-4"
    >
      <div class="flex min-w-0 flex-1 items-center gap-2 text-sm lg:flex-none">
        <UiCheckbox
          :model-value="todosSelecionados"
          aria-label="Selecionar todos os exibidos"
          @update:model-value="emit('alternar-todos')"
        />
        <span class="font-medium text-text">
          <span class="num">{{ selecionados }}</span>
          {{ selecionados === 1 ? 'selecionado' : 'selecionados' }}
        </span>
        <button
          type="button"
          class="rounded-md p-1 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Limpar seleção"
          title="Limpar seleção"
          @click="emit('limpar')"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

      <!-- Celular: uma porta só para as quatro ações. -->
      <UiButton size="sm" class="shrink-0 lg:hidden" @click="acoesAbertas = true">
        Ações
        <Icon name="lucide:chevron-up" class="h-4 w-4" />
      </UiButton>

      <!-- Desktop: os controles direto na barra. -->
      <AdminGuestsGuestListModeBulkActions
        class="hidden lg:ml-auto lg:flex"
        :grupos-disponiveis="gruposDisponiveis"
        :categorias-disponiveis="categoriasDisponiveis"
        :aplicando="aplicando"
        :total-selecionado="selecionados"
        @mover-para-grupo="moverParaGrupo"
        @alterar-categoria="alterarCategoria"
        @agrupar="agrupar"
        @excluir="excluir"
      />
    </div>
  </Transition>

  <UiModal v-model="acoesAbertas" :title="`Ações para ${rotuloDaContagem}`">
    <AdminGuestsGuestListModeBulkActions
      layout="coluna"
      :grupos-disponiveis="gruposDisponiveis"
      :categorias-disponiveis="categoriasDisponiveis"
      :aplicando="aplicando"
      :total-selecionado="selecionados"
      @mover-para-grupo="moverParaGrupo"
      @alterar-categoria="alterarCategoria"
      @agrupar="agrupar"
      @excluir="excluir"
    />
  </UiModal>
</template>
