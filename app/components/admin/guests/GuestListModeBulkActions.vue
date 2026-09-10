<!--
  As quatro ações em massa, num componente só porque são montadas em DOIS
  lugares: em fileira dentro da barra (desktop) e empilhadas dentro de um modal
  (celular). Escritas duas vezes, divergiriam na primeira mudança — e uma ação
  que existisse só num dos dois desenhos seria impossível de notar.

  Ação que ainda não existe fica desabilitada com o motivo no `title`, nunca
  escondida: o casal precisa saber que a capacidade está prevista, e um
  controle que desaparece sem explicação parece defeito.
-->
<!--
  "Agrupar como acompanhantes" exige seleção de DOIS: um núcleo de uma pessoa
  não agrupa nada, e é o estado que o banco passou a dissolver. Por isso o
  botão fica desabilitado com um só marcado, em vez de aceitar e não fazer nada.
-->
<script setup lang="ts">
interface OpcaoDeDestino {
  value: string
  label: string
}

interface Props {
  // Não `readonly`: `UiSelect` declara `options: SelectOption[]` mutável.
  gruposDisponiveis: OpcaoDeDestino[]
  categoriasDisponiveis: OpcaoDeDestino[]
  aplicando?: boolean
  /**
   * 'fileira' é a barra do desktop, onde os controles cabem lado a lado.
   * 'coluna' é o modal do celular: cada controle em largura cheia, porque em
   * fileira eles embrulhavam um por linha e os seletores truncavam o próprio
   * rótulo ("Mover para gru...").
   */
  layout?: 'fileira' | 'coluna'
  /** Quantos estão marcados — agrupar como acompanhantes precisa de dois. */
  totalSelecionado?: number
}

const {
  gruposDisponiveis,
  categoriasDisponiveis,
  aplicando = false,
  layout = 'fileira',
  totalSelecionado = 0,
} = defineProps<Props>()

const emit = defineEmits<{
  'mover-para-grupo': [grupoId: string]
  'alterar-categoria': [faixa: string]
  agrupar: []
  excluir: []
}>()

const grupoEscolhido = ref('')
const categoriaEscolhida = ref('')

const emColuna = computed(() => layout === 'coluna')

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
  <div :class="emColuna ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2'">
    <UiSelect
      v-model="grupoEscolhido"
      :disabled="aplicando"
      aria-label="Mover selecionados para grupo"
      placeholder="Mover para grupo"
      :options="gruposDisponiveis"
      :class="emColuna ? 'w-full' : 'w-40'"
      @update:model-value="moverParaGrupo"
    />

    <UiSelect
      v-model="categoriaEscolhida"
      :disabled="aplicando"
      aria-label="Alterar categoria dos selecionados"
      placeholder="Alterar categoria"
      :options="categoriasDisponiveis"
      :class="emColuna ? 'w-full' : 'w-44'"
      @update:model-value="alterarCategoria"
    />

    <!-- Não é um update em lote como os dois seletores acima: núcleo, ordem e
         convite mudam juntos numa transação (`agrupar_acompanhantes`). É a
         operação que faltava para quem monta a lista por entrada rápida ou
         colando da planilha — os nomes entram soltos, o agrupamento vem
         depois. -->
    <UiButton
      variant="ghost"
      :size="emColuna ? 'md' : 'sm'"
      :disabled="aplicando || totalSelecionado < 2"
      :class="emColuna && 'w-full justify-center'"
      :title="
        totalSelecionado < 2
          ? 'Marque ao menos duas pessoas — acompanhantes são quem vai junto.'
          : undefined
      "
      @click="emit('agrupar')"
    >
      <Icon name="lucide:user-round-plus" class="h-4 w-4" />
      Agrupar como acompanhantes
    </UiButton>

    <UiButton
      variant="destructive"
      :size="emColuna ? 'md' : 'sm'"
      :disabled="aplicando"
      :class="emColuna && 'w-full justify-center'"
      @click="emit('excluir')"
    >
      <Icon name="lucide:trash-2" class="h-4 w-4" />
      Excluir
    </UiButton>
  </div>
</template>
