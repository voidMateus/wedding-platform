<!--
  A barra de ações em massa, no mesmo molde da barra de salvar de Configurações
  (`AdminSettingsSaveBar`): só aparece quando há algo a fazer, acompanha a
  rolagem (`sticky bottom-4`) e é o último filho do contêiner — a posição
  estática já é o fim da lista, e o sticky só a puxa para cima enquanto o fim
  ainda está abaixo do viewport.

  Só com seleção, e não permanente: uma barra com quatro ações desabilitadas
  ocupa a base da tela sem oferecer nada, e no celular rouba duas fileiras de
  lista. O "selecionar todos" mora dentro dela — depois da primeira marcação,
  que é quando ele passa a ter sentido.

  Depende de nenhum ancestral ser contêiner de rolagem entre ela e o `<main>`:
  ver a nota sobre `overflow-x` em `app/assets/css/main.css`, e o
  `overflow-clip` (nunca `hidden`) de `AdminPanel`.

  Ação que ainda não existe fica desabilitada com o motivo no `title`, nunca
  escondida: o casal precisa saber que a capacidade está prevista, e um
  controle que desaparece sem explicação parece defeito.
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
  excluir: []
  limpar: []
  'alternar-todos': []
}>()

const grupoEscolhido = ref('')
const categoriaEscolhida = ref('')

function moverParaGrupo(valor: string) {
  if (!valor) return
  emit('mover-para-grupo', valor)
  grupoEscolhido.value = ''
}

function alterarCategoria(valor: string) {
  if (!valor) return
  emit('alterar-categoria', valor)
  categoriaEscolhida.value = ''
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
      class="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-surface-elevated/95 px-3 py-3 shadow-lg backdrop-blur sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-2 text-sm">
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

      <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
        <UiSelect
          v-model="grupoEscolhido"
          :disabled="aplicando"
          aria-label="Mover selecionados para grupo"
          placeholder="Mover para grupo"
          :options="gruposDisponiveis"
          class="w-40"
          @update:model-value="moverParaGrupo"
        />

        <!-- Núcleo exige orquestrar convite e ordem dentro do núcleo numa
             transação (`sincronizar_nucleo_convidado`); não é um update em lote
             como os outros dois. -->
        <UiButton
          variant="ghost"
          size="sm"
          disabled
          title="Em breve — acompanhantes são definidos no cadastro do convidado."
        >
          <Icon name="lucide:user-round-plus" class="h-4 w-4" />
          Adicionar ao núcleo
        </UiButton>

        <UiSelect
          v-model="categoriaEscolhida"
          :disabled="aplicando"
          aria-label="Alterar categoria dos selecionados"
          placeholder="Alterar categoria"
          :options="categoriasDisponiveis"
          class="w-44"
          @update:model-value="alterarCategoria"
        />

        <UiButton variant="destructive" size="sm" :disabled="aplicando" @click="emit('excluir')">
          <Icon name="lucide:trash-2" class="h-4 w-4" />
          Excluir
        </UiButton>
      </div>
    </div>
  </Transition>
</template>
