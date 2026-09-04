<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { inviteInputSchema } from '#shared/schemas/invites'
import { getApiErrorMessage } from '~/utils/api-error'
import type { InviteDetail } from '~/types/invite'

interface Props {
  invite: InviteDetail
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Convite salvo — o pai recarrega o detalhe e a Linha do Tempo. */
  saved: []
}>()

const { updateInvite } = useInvites()
const toast = useToast()

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(inviteInputSchema),
  initialValues: {
    nome: props.invite.nome,
    observacoes: props.invite.observacoes ?? '',
  },
})

const [name] = defineField('nome')
const [notes] = defineField('observacoes')

const formErrorMessage = ref<string | null>(null)

// PATCH /api/invites/:id é sobrescrita total: campo que não vai no corpo é
// gravado como null. Responsável (definido na lista de Convidados ao lado) e
// max_acompanhantes (sem campo em nenhum formulário) precisam ser reenviados
// como estão, ou salvar o nome apagaria os dois.
const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    await updateInvite(props.invite.id, {
      ...values,
      convidadoResponsavelId: props.invite.convidado_responsavel_id ?? '',
      maxAcompanhantes: props.invite.max_acompanhantes ?? undefined,
    })
    toast.success('Convite atualizado.')
    emit('saved')
  } catch (err) {
    formErrorMessage.value = getApiErrorMessage(
      err,
      'Não foi possível salvar o convite. Tente novamente.',
    )
  }
})
</script>

<template>
  <AdminInvitesInviteSection title="Convite">
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

      <div class="flex justify-end">
        <UiButton size="sm" type="submit" :disabled="isSubmitting">Salvar</UiButton>
      </div>
    </form>
  </AdminInvitesInviteSection>
</template>
