<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toast = useToast()
const { updateWedding } = useWedding()

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(weddingSettingsSchema),
})

const [coupleNames] = defineField('coupleNames')
const [eventDate] = defineField('eventDate')
const [eventTime] = defineField('eventTime')
const [rsvpDeadline] = defineField('rsvpDeadline')
const [childMaxAge] = defineField('childMaxAge')
const [guestListMode] = defineField('guestListMode')
const [infinitepayHandle] = defineField('infinitepayHandle')
const [physicalGiftDeliveryMode] = defineField('physicalGiftDeliveryMode')

// UiInput só trabalha com string — childMaxAge no form é number (schema com
// z.coerce.number()), daí o proxy de string aqui (mesmo padrão de
// maxMembersText no antigo formulário de grupos).
const childMaxAgeText = computed({
  get: () => (childMaxAge.value === undefined ? '' : String(childMaxAge.value)),
  set: (value: string) => {
    childMaxAge.value = value === '' ? undefined : Number(value)
  },
})

watch(
  () => props.wedding,
  (value) => {
    if (!value) return
    resetForm({
      values: {
        coupleNames: value.couple_names,
        eventDate: value.event_date,
        eventTime: value.event_time ? value.event_time.slice(0, 5) : '',
        rsvpDeadline: value.rsvp_deadline ? isoToDatetimeLocal(value.rsvp_deadline) : '',
        childMaxAge: value.child_max_age,
        guestListMode: value.guest_list_mode as 'closed' | 'open',
        infinitepayHandle: value.infinitepay_handle ?? '',
        physicalGiftDeliveryMode: value.physical_gift_delivery_mode as
          'both' | 'self_purchase_only' | 'payment_only',
      },
    })
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  try {
    await updateWedding(values)
    toast.success('Configurações salvas.')
  } catch (err) {
    toast.error(
      isApiError(err)
        ? (err.data?.message ?? 'Não foi possível salvar as configurações.')
        : 'Não foi possível salvar as configurações.',
    )
  }
})
</script>

<template>
  <UiCard>
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput v-model="coupleNames" label="Nome do casal" :error="errors.coupleNames" />
      <div class="flex gap-3">
        <UiInput
          v-model="eventDate"
          type="date"
          label="Data do casamento"
          class="flex-1"
          :error="errors.eventDate"
        />
        <UiInput
          v-model="eventTime"
          type="time"
          label="Horário (opcional)"
          class="flex-1"
          :error="errors.eventTime"
        />
      </div>
      <p class="-mt-2 text-xs text-text-muted">
        Usado na contagem regressiva do site. Sem horário definido, a contagem mira meia-noite do
        dia do evento.
      </p>
      <UiInput
        v-model="rsvpDeadline"
        type="datetime-local"
        label="Prazo final de RSVP (opcional)"
        :error="errors.rsvpDeadline"
      />
      <UiInput
        v-model="childMaxAgeText"
        type="number"
        label="Idade máxima considerada criança"
        :error="errors.childMaxAge"
      />
      <UiSelect
        v-model="guestListMode"
        label="Lista de convidados"
        :options="[
          { value: 'closed', label: 'Fechada (só convidados pré-cadastrados)' },
          { value: 'open', label: 'Aberta (permite acompanhante avulso no RSVP)' },
        ]"
        :error="errors.guestListMode"
      />
      <UiInput
        v-model="infinitepayHandle"
        label="InfiniteTag da InfinitePay (opcional)"
        placeholder="seuhandle"
        :error="errors.infinitepayHandle"
      />
      <p class="-mt-2 text-xs text-text-muted">
        Ativa o pagamento online na lista de presentes (Contribuições, Presentes Emocionais e a
        opção de presentear a lista física pagando o valor). Sem isso preenchido, os convidados só
        podem reservar presentes físicos gratuitamente. Informe sua InfiniteTag pública, sem o "$" —
        os métodos de pagamento aceitos (Pix, cartão) são definidos diretamente na sua conta
        InfinitePay, não aqui.
      </p>
      <UiSelect
        v-model="physicalGiftDeliveryMode"
        label="Como presentear a Lista de Presentes física"
        :options="[
          { value: 'both', label: 'Convidado escolhe: comprar e entregar, ou pagar online' },
          { value: 'self_purchase_only', label: 'Só comprar e entregar (sem pagamento online)' },
          { value: 'payment_only', label: 'Só pagamento online (sem opção de entregar)' },
        ]"
        :error="errors.physicalGiftDeliveryMode"
      />

      <div class="flex justify-end">
        <UiButton type="submit" :disabled="isSubmitting">Salvar dados do evento</UiButton>
      </div>
    </form>
  </UiCard>
</template>
