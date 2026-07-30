<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useFieldArray, useForm } from 'vee-validate'
import { rsvpSubmitSchema } from '#shared/schemas/rsvp'
import type { RsvpDetails } from '~/types/rsvp'

interface Props {
  code: string
  details: RsvpDetails
}

const { code, details } = defineProps<Props>()

const emit = defineEmits<{
  submitted: []
}>()

const { submitRsvp } = useRsvp(code)

const initialStatus =
  details.response?.status === 'confirmed' || details.response?.status === 'declined'
    ? details.response.status
    : undefined

const { handleSubmit, defineField, errors, isSubmitting, values } = useForm({
  validationSchema: toTypedSchema(rsvpSubmitSchema),
  initialValues: {
    status: initialStatus,
    dietaryNotes: details.response?.dietaryNotes ?? '',
    message: details.response?.message ?? '',
    companions:
      initialStatus === 'confirmed'
        ? (details.response?.companions ?? []).map((c) => ({
            fullName: c.fullName,
            dietaryRestrictions: c.dietaryRestrictions ?? '',
          }))
        : [],
  },
})

const [status] = defineField('status')
const [dietaryNotes] = defineField('dietaryNotes')
const [message] = defineField('message')
const { fields: companionFields, push: pushCompanion, remove: removeCompanion } = useFieldArray<{
  fullName: string
  dietaryRestrictions?: string
}>('companions')

watch(status, (value, previous) => {
  if (value === 'declined' && previous === 'confirmed') {
    for (let i = companionFields.value.length - 1; i >= 0; i--) {
      removeCompanion(i)
    }
  }
})

function addCompanion() {
  if (companionFields.value.length >= details.maxMembers) return
  pushCompanion({ fullName: '', dietaryRestrictions: '' })
}

const submitErrorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const onSubmit = handleSubmit(async (formValues) => {
  submitErrorMessage.value = null
  successMessage.value = null
  try {
    await submitRsvp(formValues)
    successMessage.value =
      formValues.status === 'confirmed'
        ? 'Presença confirmada! Você pode alterar sua resposta até o prazo final.'
        : 'Resposta registrada. Sentiremos sua falta!'
    emit('submitted')
  } catch {
    submitErrorMessage.value = 'Não foi possível enviar sua resposta. Tente novamente.'
  }
})
</script>

<template>
  <form class="flex flex-col gap-5" @submit="onSubmit">
    <UiRadioGroup
      v-model="status"
      label="Você vai comparecer?"
      :disabled="details.isPastDeadline"
      :error="errors.status"
      :options="[
        { value: 'confirmed', label: 'Sim, vou comparecer' },
        { value: 'declined', label: 'Não vou conseguir ir' },
      ]"
    />

    <template v-if="values.status === 'confirmed'">
      <UiTextarea
        v-model="dietaryNotes"
        label="Sua restrição alimentar (opcional)"
        placeholder="Ex.: vegetariano, sem glúten, alergia a amendoim"
        :disabled="details.isPastDeadline"
        :error="errors.dietaryNotes"
      />

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text">
            Acompanhantes ({{ companionFields.length }}/{{ details.maxMembers }})
          </span>
          <UiButton
            type="button"
            size="sm"
            variant="ghost"
            :disabled="details.isPastDeadline || companionFields.length >= details.maxMembers"
            @click="addCompanion"
          >
            Adicionar acompanhante
          </UiButton>
        </div>

        <div
          v-for="(field, index) in companionFields"
          :key="field.key"
          class="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div class="flex items-start gap-2">
            <UiInput
              v-model="field.value.fullName"
              class="flex-1"
              label="Nome do acompanhante"
              :disabled="details.isPastDeadline"
              :error="(errors as Record<string, string>)[`companions[${index}].fullName`]"
            />
            <UiButton
              type="button"
              size="sm"
              variant="ghost"
              :disabled="details.isPastDeadline"
              class="mt-6"
              @click="removeCompanion(index)"
            >
              Remover
            </UiButton>
          </div>
          <UiInput
            v-model="field.value.dietaryRestrictions"
            label="Restrição alimentar (opcional)"
            :disabled="details.isPastDeadline"
          />
        </div>
      </div>
    </template>

    <UiTextarea
      v-model="message"
      label="Mensagem para o casal (opcional)"
      :disabled="details.isPastDeadline"
      :error="errors.message"
    />

    <p v-if="submitErrorMessage" class="text-sm text-red-600" role="alert">
      {{ submitErrorMessage }}
    </p>
    <p v-if="successMessage" class="text-sm text-green-700" role="status">
      {{ successMessage }}
    </p>

    <UiButton type="submit" :disabled="isSubmitting || details.isPastDeadline">
      {{ details.response ? 'Atualizar resposta' : 'Enviar resposta' }}
    </UiButton>
  </form>
</template>
