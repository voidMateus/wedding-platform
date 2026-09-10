<!--
  As quatro ações em massa, num componente só porque são montadas em DOIS
  lugares: em fileira dentro da barra (desktop) e empilhadas dentro de um modal
  (celular). Escritas duas vezes, divergiriam na primeira mudança — e uma ação
  que existisse só num dos dois desenhos seria impossível de notar.

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
}

const {
  gruposDisponiveis,
  categoriasDisponiveis,
  aplicando = false,
  layout = 'fileira',
} = defineProps<Props>()

const emit = defineEmits<{
  'mover-para-grupo': [grupoId: string]
  'alterar-categoria': [faixa: string]
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

    <!-- Núcleo exige orquestrar convite e ordem dentro do núcleo numa
         transação (`sincronizar_nucleo_convidado`); não é um update em lote
         como os outros dois. -->
    <UiButton
      variant="ghost"
      :size="emColuna ? 'md' : 'sm'"
      disabled
      :class="emColuna && 'w-full justify-center'"
      title="Em breve — acompanhantes são definidos no cadastro do convidado."
    >
      <Icon name="lucide:user-round-plus" class="h-4 w-4" />
      Adicionar ao núcleo
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
