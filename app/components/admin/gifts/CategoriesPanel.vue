<!--
  As categorias da lista de presentes — o que agrupa os itens na página do
  convidado, e em que ordem.

  Elas viviam num modal atrás de um botão na lista de presentes, e o lugar
  estava errado nos dois sentidos: categoria não é uma etapa do cadastro de um
  presente (o formulário do presente já a escolhe), e a ordem delas é uma
  decisão sobre **como a página fica**, não sobre o acervo. Aqui ela está ao
  lado das outras decisões de exibição.

  Não é uma tela própria, pelo mesmo critério do Financeiro: categoria é
  ATRIBUTO. Ela é filtro na lista e ordenação aqui — os dois lugares onde
  significa alguma coisa.
-->
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'
import type { GiftCategory } from '~/types/gift-category'

interface Props {
  categorias: readonly GiftCategory[]
}

const { categorias } = defineProps<Props>()
const emit = defineEmits<{ changed: [] }>()

const { createGiftCategory, updateGiftCategory, deleteGiftCategory } = useGiftCategories()

const editando = ref(false)
const emEdicao = ref<GiftCategory | null>(null)
const mensagemDeErro = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(giftCategoryInputSchema),
  initialValues: { nome: '', ordemExibicao: 0 },
})

const [nome] = defineField('nome')
const [ordemExibicao] = defineField('ordemExibicao')

// O campo é `type="number"`, e o valor do schema é número: o proxy existe para
// que apagar o campo vire `undefined` em vez de `NaN`.
const ordemComoTexto = computed({
  get: () => (ordemExibicao.value === undefined ? '' : String(ordemExibicao.value)),
  set: (valor: string) => {
    ordemExibicao.value = valor === '' ? undefined : Number(valor)
  },
})

function comecarACriar() {
  emEdicao.value = null
  mensagemDeErro.value = null
  resetForm({ values: { nome: '', ordemExibicao: categorias.length + 1 } })
  editando.value = true
}

function comecarAEditar(categoria: GiftCategory) {
  emEdicao.value = categoria
  mensagemDeErro.value = null
  resetForm({ values: { nome: categoria.nome, ordemExibicao: categoria.ordem_exibicao } })
  editando.value = true
}

function cancelar() {
  editando.value = false
  emEdicao.value = null
  mensagemDeErro.value = null
}

const salvar = handleSubmit(async (valores) => {
  mensagemDeErro.value = null
  try {
    if (emEdicao.value) {
      await updateGiftCategory(emEdicao.value.id, valores)
    } else {
      await createGiftCategory(valores)
    }
    // Fecha só o formulário: quem está organizando categorias quase sempre
    // mexe em mais de uma seguida.
    editando.value = false
    emEdicao.value = null
    emit('changed')
  } catch {
    mensagemDeErro.value = 'Não foi possível salvar a categoria.'
  }
})

async function excluir(categoria: GiftCategory) {
  try {
    await deleteGiftCategory(categoria.id)
    emit('changed')
  } catch {
    mensagemDeErro.value = `Não foi possível excluir "${categoria.nome}".`
  }
}
</script>

<template>
  <AdminPanel title="Categorias" :meta="`${categorias.length} na lista`">
    <div class="flex flex-col gap-4 p-4 sm:p-5">
      <p class="text-sm text-text-muted">
        Agrupam os presentes na página do convidado, na ordem definida aqui. São opcionais — sem
        nenhuma, a lista aparece corrida.
      </p>

      <div v-if="categorias.length" class="flex flex-wrap gap-2">
        <UiChip
          v-for="categoria in categorias"
          :key="categoria.id"
          :label="`${categoria.ordem_exibicao}. ${categoria.nome}`"
          removable
          @remove="excluir(categoria)"
        >
          <template #actions>
            <button
              type="button"
              class="text-text-muted transition-brand hover:text-text"
              :aria-label="`Editar categoria ${categoria.nome}`"
              @click="comecarAEditar(categoria)"
            >
              <Icon name="lucide:pencil" class="h-3 w-3" />
            </button>
          </template>
        </UiChip>
      </div>
      <p v-else class="text-sm text-text-muted">Nenhuma categoria cadastrada ainda.</p>

      <form
        v-if="editando"
        class="flex flex-col gap-3 border-t border-border pt-4"
        @submit="salvar"
      >
        <p class="text-xs font-semibold tracking-wide text-text-muted uppercase">
          {{ emEdicao ? 'Editar categoria' : 'Nova categoria' }}
        </p>
        <UiInput v-model="nome" label="Nome" :error="errors.nome" />
        <UiInput
          v-model="ordemComoTexto"
          type="number"
          label="Ordem de exibição"
          :error="errors.ordemExibicao"
        />
        <p v-if="mensagemDeErro" class="text-sm text-danger" role="alert">{{ mensagemDeErro }}</p>
        <div class="flex justify-end gap-2">
          <UiButton type="button" size="sm" variant="ghost" @click="cancelar">Cancelar</UiButton>
          <UiButton type="submit" size="sm" :disabled="isSubmitting">Salvar</UiButton>
        </div>
      </form>

      <div v-else>
        <UiButton size="sm" variant="ghost" @click="comecarACriar">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Nova categoria
        </UiButton>
      </div>
    </div>
  </AdminPanel>
</template>
