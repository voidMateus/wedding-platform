<script setup lang="ts">
import type { BudgetCategoryInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento } from '~/types/finance'

interface Props {
  modelValue: boolean
  categoria?: Pick<
    CategoriaOrcamento,
    'id' | 'nome' | 'valor_previsto_centavos' | 'cor_indice' | 'cor_personalizada'
  > | null
}

const { modelValue, categoria = null } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: BudgetCategoryInput]
}>()

const nome = ref('')
const valorPrevisto = ref<number | null>(null)
const erro = ref('')

/**
 * A cor é automática por padrão: ela vem do slot da categoria na paleta
 * derivada do tema do casamento, então trocar o tema repinta tudo sozinho.
 * Escolher uma cor aqui é fixá-la — vale para a categoria que o casal quer
 * reconhecer de longe, e é por isso que é escolha, não estado inicial.
 */
const { corDaCategoria, paleta } = useCategoriaCores()

const corPersonalizada = ref<string | null>(null)
const automatica = computed(() => corPersonalizada.value === null)

const corAutomatica = computed(() => corDaCategoria(categoria?.cor_indice ?? 0, null))

const editando = computed(() => Boolean(categoria))

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    nome.value = categoria?.nome ?? ''
    valorPrevisto.value = categoria?.valor_previsto_centavos ?? null
    corPersonalizada.value = categoria?.cor_personalizada ?? null
  },
)

function submeter() {
  if (!nome.value.trim()) {
    erro.value = 'Informe um nome para a categoria.'
    return
  }

  emit('salvar', {
    nome: nome.value.trim(),
    valorPrevistoCentavos: valorPrevisto.value ?? 0,
    ordemExibicao: 0,
    corPersonalizada: corPersonalizada.value,
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="editando ? 'Editar categoria' : 'Nova categoria'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <UiInput v-model="nome" label="Nome" placeholder="Decoração e flores" />
      <UiCurrencyInput
        v-model="valorPrevisto"
        label="Teto desta categoria (opcional)"
        :error="erro ?? undefined"
      />
      <!-- Opcional de verdade, e a tela não o repete: o teto é guarda-corpo,
           não número de leitura diária. Quem imagina o custo é a estimativa de
           cada gasto; o teto só fala quando é ultrapassado. -->
      <p class="text-xs text-text-muted">
        Em branco, esta categoria não avisa nada — o que vale é a estimativa de cada gasto. Com um
        teto definido, a categoria avisa quando o planejado passar dele.
      </p>

      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm font-medium text-text">Cor da categoria</legend>
        <p class="text-xs text-text-muted">
          A automática vem da cor do casamento e acompanha qualquer mudança de tema.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="automatica ? 'border-primary text-text' : 'border-border text-text-muted'"
            :aria-pressed="automatica"
            @click="corPersonalizada = null"
          >
            <span
              aria-hidden="true"
              class="h-4 w-4 rounded-full border border-border"
              :style="{ backgroundColor: corAutomatica.solida }"
            />
            Automática
          </button>

          <button
            v-for="(cor, indice) in paleta"
            :key="indice"
            type="button"
            class="h-8 w-8 rounded-full border-2 transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="corPersonalizada === cor.solida ? 'border-text' : 'border-transparent'"
            :style="{ backgroundColor: cor.solida }"
            :aria-label="`Usar a cor ${indice + 1} da paleta`"
            :aria-pressed="corPersonalizada === cor.solida"
            @click="corPersonalizada = cor.solida"
          />
        </div>
      </fieldset>

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton @click="submeter">{{ editando ? 'Salvar' : 'Adicionar categoria' }}</UiButton>
    </template>
  </UiModal>
</template>
