<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { inviteInputSchema } from '#shared/schemas/invites'
import { getApiErrorMessage } from '~/utils/api-error'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Convite criado — o pai abre o modal de detalhe dele, onde se adicionam os convidados. */
  created: [invite: { id: string }]
}>()

const { createInvite } = useInvites()

// Só o essencial para o convite existir: responsável, etiquetas e convidados
// dependem do convite já criado e vivem no modal de detalhe, que abre em
// seguida — pedir tudo aqui seria um formulário com metade dos campos inertes.
const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(inviteInputSchema),
  initialValues: { nome: '', observacoes: '' },
})

const [name] = defineField('nome')
const [notes] = defineField('observacoes')
const formErrorMessage = ref<string | null>(null)

// O formulário vive fora do conteúdo do dialog (que o Reka desmonta ao
// fechar), então precisa ser zerado a cada abertura — senão o próximo "Novo
// convite" abriria com o que foi digitado da última vez.
watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen) return
    resetForm({ values: { nome: '', observacoes: '' } })
    formErrorMessage.value = null
  },
)

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    const invite = await createInvite(values)
    emit('created', invite)
  } catch (err) {
    formErrorMessage.value = getApiErrorMessage(
      err,
      'Não foi possível criar o convite. Tente novamente.',
    )
  }
})
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Novo convite"
    description="Depois de criar, o convite abre para você vincular os convidados e gerar o link de acesso."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput
        v-model="name"
        label="Nome do convite"
        placeholder="Ex.: Família José Silva"
        :error="errors.nome"
      />
      <UiTextarea
        v-model="notes"
        label="Observações internas (opcional)"
        placeholder="Nunca exibidas ao convidado — ex.: Mesa VIP"
        :error="errors.observacoes"
      />

      <p v-if="formErrorMessage" class="text-sm text-danger" role="alert">
        {{ formErrorMessage }}
      </p>

      <div class="mt-2 flex justify-end gap-2">
        <UiButton
          type="button"
          variant="ghost"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="isSubmitting">Criar</UiButton>
      </div>
    </form>
  </UiModal>
</template>
