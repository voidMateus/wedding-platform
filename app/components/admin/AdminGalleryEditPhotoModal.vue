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
  initialValues: { caption: '', displayOrder: 0, focalX: 50, focalY: 50 },
})

const [caption] = defineField('caption')
const [displayOrder] = defineField('displayOrder')
const [focalX] = defineField('focalX')
const [focalY] = defineField('focalY')

const displayOrderText = computed({
  get: () => (displayOrder.value === undefined ? '' : String(displayOrder.value)),
  set: (value: string) => {
    displayOrder.value = value === '' ? undefined : Number(value)
  },
})

const focalPoint = computed({
  get: () => ({ x: focalX.value ?? 50, y: focalY.value ?? 50 }),
  set: (value: { x: number; y: number }) => {
    focalX.value = value.x
    focalY.value = value.y
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
        caption: current.caption ?? '',
        displayOrder: current.display_order,
        focalX: current.focal_x,
        focalY: current.focal_y,
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
      <AdminImageFocalPointPicker
        v-if="photo"
        v-model="focalPoint"
        :src="photo.url"
        :alt="photo.caption || 'Foto da galeria'"
        preview-aspect-class="aspect-square"
      />
      <UiInput v-model="caption" label="Legenda (opcional)" :error="errors.caption" />
      <UiInput
        v-model="displayOrderText"
        type="number"
        label="Ordem de exibição"
        :error="errors.displayOrder"
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
