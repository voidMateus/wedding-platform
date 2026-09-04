<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { EMOTIONAL_GIFT_ICONS, giftInputSchema } from '#shared/schemas/gifts'
import { getApiErrorMessage } from '~/utils/api-error'
import type { GiftCategory } from '~/types/gift-category'
import type { Gift } from '~/types/gift'

interface Props {
  modelValue: boolean
  gift: Gift | null
  categories: GiftCategory[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { createGift, updateGift } = useGifts()
const errorMessage = ref<string | null>(null)

const EMPTY_VALUES = {
  titulo: '',
  descricao: '',
  precoCentavos: undefined,
  urlImagem: '',
  categoriaId: '',
  ePresenteCota: false,
  quantidadeDisponivel: 1,
  valorMetaCentavos: undefined,
  valorCotaCentavos: undefined,
  estiloExibicao: 'padrao' as const,
  iconeEmocional: '',
  estaAtivo: true,
}

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(giftInputSchema),
  initialValues: EMPTY_VALUES,
})

const [titulo] = defineField('titulo')
const [descricao] = defineField('descricao')
const [precoCentavos] = defineField('precoCentavos')
const [urlImagem] = defineField('urlImagem')
const [categoriaId] = defineField('categoriaId')
const [ePresenteCota] = defineField('ePresenteCota')
const [quantidadeDisponivel] = defineField('quantidadeDisponivel')
const [valorMetaCentavos] = defineField('valorMetaCentavos')
const [valorCotaCentavos] = defineField('valorCotaCentavos')
const [estiloExibicao] = defineField('estiloExibicao')
const [iconeEmocional] = defineField('iconeEmocional')
const [estaAtivo] = defineField('estaAtivo')

const quantityAvailableText = computed({
  get: () => (quantidadeDisponivel.value === undefined ? '' : String(quantidadeDisponivel.value)),
  set: (value: string) => {
    quantidadeDisponivel.value = value === '' ? undefined : Number(value)
  },
})

const giftTypeValue = computed({
  get: () => (ePresenteCota.value ? 'group' : 'simple'),
  set: (value: string) => {
    ePresenteCota.value = value === 'group'
  },
})

const emotionalIconOptions = EMOTIONAL_GIFT_ICONS.map((icon) => ({
  value: icon.value,
  label: icon.label,
}))

// Limpa os campos do modo que deixou de se aplicar ao alternar o tipo — evita
// enviar um valor "fantasma" de uma seção escondida (a Zod schema não proíbe
// isso, ela é deliberadamente permissiva aqui e confia no mapeamento do
// server pra nulificar; isto é só higiene de formulário).
watch(ePresenteCota, (isGroup) => {
  if (isGroup) {
    quantidadeDisponivel.value = undefined
  } else {
    valorMetaCentavos.value = undefined
    valorCotaCentavos.value = undefined
    estiloExibicao.value = 'padrao'
    iconeEmocional.value = ''
  }
})

watch(
  () => [props.modelValue, props.gift] as const,
  ([open, gift]) => {
    if (!open) return
    errorMessage.value = null
    resetForm({
      values: gift
        ? {
            titulo: gift.titulo,
            descricao: gift.descricao ?? '',
            precoCentavos: gift.preco_centavos ?? undefined,
            urlImagem: gift.url_imagem ?? '',
            categoriaId: gift.categoria_id ?? '',
            ePresenteCota: gift.e_presente_cota,
            quantidadeDisponivel: gift.quantidade_disponivel ?? undefined,
            valorMetaCentavos: gift.valor_meta_centavos ?? undefined,
            valorCotaCentavos: gift.valor_cota_centavos ?? undefined,
            estiloExibicao: (gift.estilo_exibicao as 'padrao' | 'emocional') ?? 'padrao',
            iconeEmocional: gift.icone_emocional ?? '',
            estaAtivo: gift.esta_ativo,
          }
        : EMPTY_VALUES,
    })
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  try {
    if (props.gift) {
      await updateGift(props.gift.id, values)
    } else {
      await createGift(values)
    }
    emit('update:modelValue', false)
    emit('saved')
  } catch (err) {
    errorMessage.value = getApiErrorMessage(err, 'Não foi possível salvar o presente.')
  }
})
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="gift ? 'Editar presente' : 'Novo presente'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput v-model="titulo" label="Título" :error="errors.titulo" />
      <UiTextarea v-model="descricao" label="Descrição (opcional)" :error="errors.descricao" />
      <UiSelect
        v-model="categoriaId"
        label="Categoria (opcional)"
        placeholder="Sem categoria"
        :options="categories.map((c) => ({ value: c.id, label: c.nome }))"
      />
      <UiInput v-model="urlImagem" label="URL da imagem (opcional)" :error="errors.urlImagem" />
      <UiSelect
        v-model="giftTypeValue"
        label="Tipo"
        :options="[
          { value: 'simple', label: 'Presente simples (reserva exclusiva)' },
          { value: 'group', label: 'Presente de cota (contribuição em dinheiro)' },
        ]"
      />

      <UiInput
        v-if="!ePresenteCota"
        v-model="quantityAvailableText"
        type="number"
        label="Quantidade disponível"
        :error="errors.quantidadeDisponivel"
      />
      <UiCurrencyInput
        v-if="!ePresenteCota"
        v-model="precoCentavos"
        label="Preço estimado (opcional — necessário para permitir pagamento online)"
        :error="errors.precoCentavos"
      />

      <template v-if="ePresenteCota">
        <UiCurrencyInput
          v-model="valorMetaCentavos"
          label="Valor-alvo da cota"
          :error="errors.valorMetaCentavos"
        />
        <UiCurrencyInput
          v-model="valorCotaCentavos"
          label="Valor de cada cota fixa (opcional)"
          :error="errors.valorCotaCentavos"
        />
        <p class="-mt-2 text-xs text-text-muted">
          Preenchido, o convidado escolhe quantidade de cotas em vez de digitar um valor livre.
        </p>
        <UiSelect
          v-model="estiloExibicao"
          label="Estilo de exibição"
          :options="[
            { value: 'padrao', label: 'Padrão (foto do produto)' },
            { value: 'emocional', label: 'Emocional (ícone + frase, sem foto)' },
          ]"
        />
        <UiSelect
          v-if="estiloExibicao === 'emocional'"
          v-model="iconeEmocional"
          label="Ícone"
          placeholder="Escolha um ícone"
          :options="emotionalIconOptions"
          :error="errors.iconeEmocional"
        />
      </template>

      <UiCheckbox v-model="estaAtivo" label="Visível na vitrine pública" />

      <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <UiButton type="button" variant="ghost" @click="emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
      </div>
    </form>
  </UiModal>
</template>
