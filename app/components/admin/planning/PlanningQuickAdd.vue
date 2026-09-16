<!--
  A linha de entrada da checklist — sempre visível, no topo da lista.

  Criar tarefa é DIGITAR, não abrir formulário: o gesto se repete dezenas de
  vezes, e um modal por tarefa é o que empurra a lista de volta para o papel.
  Terceira vez que o produto aplica isso (Categorias do Financeiro, Modo Lista),
  e a primeira em que a tela já nasce assim.

  Depois de salvar, o campo se limpa e o foco FICA — quem acabou de escrever
  uma tarefa quase sempre tem a próxima na cabeça, e devolver o cursor ao início
  da tela cobraria um clique por linha.

  Sem caixa própria: ela é a primeira FAIXA do painel branco da checklist,
  separada por um divisor, como a barra de filtros é a primeira faixa do painel
  de Convidados. Antes era um retângulo tracejado sobre o fundo da página, e ao
  lado de um painel branco isso lia como um segundo painel mais fraco — dois
  contêineres para uma coisa só.
-->
<script setup lang="ts">
const toast = useToast()
const { criarTarefa } = usePlanning()

const titulo = ref('')
const prazo = ref('')
const salvando = ref(false)

async function adicionar() {
  const texto = titulo.value.trim()
  // Sem texto não há tarefa: Enter num campo vazio não cria uma linha sem nome.
  if (!texto || salvando.value) return

  salvando.value = true
  try {
    await criarTarefa({ titulo: texto, prazo: prazo.value || null })
    titulo.value = ''
    prazo.value = ''
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível criar a tarefa.'))
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div
    class="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5"
    @keyup.enter="adicionar"
  >
    <UiInput
      class="min-w-0 flex-1"
      :model-value="titulo"
      aria-label="Nova tarefa"
      placeholder="O que precisa ser feito?"
      @update:model-value="titulo = $event"
    />
    <UiDatePicker
      class="sm:w-44"
      clearable
      :model-value="prazo"
      placeholder="Prazo (opcional)"
      @update:model-value="prazo = $event"
    />
    <UiButton size="sm" :disabled="!titulo.trim() || salvando" @click="adicionar">
      <Icon name="lucide:plus" class="h-4 w-4" />
      Adicionar
    </UiButton>
  </div>
</template>
