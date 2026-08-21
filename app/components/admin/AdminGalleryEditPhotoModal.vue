<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { photoMetadataSchema } from '#shared/schemas/photos'
import type { PhotoWithUrl } from '~/types/photo'

interface Props {
  modelValue: boolean
  photo: PhotoWithUrl | null
}

const { modelValue, photo } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { updatePhoto } = useWeddingPhotos()
const errorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(photoMetadataSchema),
  initialValues: { legenda: '', ordemExibicao: 0, focoX: 50, focoY: 50 },
})

const [legenda] = defineField('legenda')
const [ordemExibicao] = defineField('ordemExibicao')
const [focoX] = defineField('focoX')
const [focoY] = defineField('focoY')

const displayOrderText = computed({
  get: () => (ordemExibicao.value === undefined ? '' : String(ordemExibicao.value)),
  set: (value: string) => {
    ordemExibicao.value = value === '' ? undefined : Number(value)
  },
})

const focalPoint = computed({
  get: () => ({ x: focoX.value ?? 50, y: focoY.value ?? 50 }),
  set: (value: { x: number; y: number }) => {
    focoX.value = value.x
    focoY.value = value.y
  },
})

// Repovoa o formulário sempre que o modal abre com uma foto nova — o mesmo
// componente é reaproveitado para editar qualquer foto da grade.
watch(
  () => [modelValue, photo] as const,
  ([open, current]) => {
    if (!open || !current) return
    errorMessage.value = null
    resetForm({
      values: {
        legenda: current.legenda ?? '',
        ordemExibicao: current.ordem_exibicao,
        focoX: current.foco_x,
        focoY: current.foco_y,
      },
    })
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  if (!photo) return
  errorMessage.value = null
  try {
    await updatePhoto(photo.id, values)
    emit('update:modelValue', false)
    emit('saved')
  } catch {
    errorMessage.value = 'Não foi possível salvar as alterações.'
  }
})
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Editar foto"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiImageFocalPointPicker
        v-if="photo"
        v-model="focalPoint"
        :src="photo.url"
        :alt="photo.legenda || 'Foto da galeria'"
        preview-aspect-class="aspect-square"
      />
      <UiInput v-model="legenda" label="Legenda (opcional)" :error="errors.legenda" />
      <UiInput
        v-model="displayOrderText"
        type="number"
        label="Ordem de exibição"
        :error="errors.ordemExibicao"
      />
      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <UiButton type="button" variant="ghost" @click="$emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
      </div>
    </form>
  </UiModal>
</template>
