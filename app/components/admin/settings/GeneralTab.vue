<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()

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

const [nomesNoivos] = defineField('nomesNoivos')
const [dataEvento] = defineField('dataEvento')
const [horarioEvento] = defineField('horarioEvento')
const [prazoRsvp] = defineField('prazoRsvp')
const [idadeMaximaCrianca] = defineField('idadeMaximaCrianca')
const [modoListaConvidados] = defineField('modoListaConvidados')
const [handleInfinitepay] = defineField('handleInfinitepay')
const [modoEntregaPresenteFisico] = defineField('modoEntregaPresenteFisico')

// UiInput só trabalha com string — idadeMaximaCrianca no form é number (schema
// com z.coerce.number()), daí o proxy de string aqui (mesmo padrão de
// maxMembersText no antigo formulário de grupos).
const idadeMaximaCriancaText = computed({
  get: () => (idadeMaximaCrianca.value === undefined ? '' : String(idadeMaximaCrianca.value)),
  set: (value: string) => {
    idadeMaximaCrianca.value = value === '' ? undefined : Number(value)
  },
})

watch(
  () => props.wedding,
  (value) => {
    if (!value) return
    resetForm({
      values: {
        nomesNoivos: value.nomes_noivos,
        dataEvento: value.data_evento,
        horarioEvento: value.horario_evento ? value.horario_evento.slice(0, 5) : '',
        prazoRsvp: value.prazo_rsvp ? isoToDatetimeLocal(value.prazo_rsvp) : '',
        idadeMaximaCrianca: value.idade_maxima_crianca,
        modoListaConvidados: value.modo_lista_convidados as 'fechada' | 'aberta',
        handleInfinitepay: value.handle_infinitepay ?? '',
        modoEntregaPresenteFisico: value.modo_entrega_presente_fisico as
          'ambos' | 'somente_compra_propria' | 'somente_pagamento',
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
    toast.error(getApiErrorMessage(err, 'Não foi possível salvar as configurações.'))
  }
})
</script>

<template>
  <UiCard>
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput v-model="nomesNoivos" label="Nome do casal" :error="errors.nomesNoivos" />
      <div class="flex gap-3">
        <UiInput
          v-model="dataEvento"
          type="date"
          label="Data do casamento"
          class="flex-1"
          :error="errors.dataEvento"
        />
        <UiInput
          v-model="horarioEvento"
          type="time"
          label="Horário (opcional)"
          class="flex-1"
          :error="errors.horarioEvento"
        />
      </div>
      <p class="-mt-2 text-xs text-text-muted">
        Usado na contagem regressiva do site. Sem horário definido, a contagem mira meia-noite do
        dia do evento.
      </p>
      <UiInput
        v-model="prazoRsvp"
        type="datetime-local"
        label="Prazo final de RSVP (opcional)"
        :error="errors.prazoRsvp"
      />
      <UiInput
        v-model="idadeMaximaCriancaText"
        type="number"
        label="Idade máxima considerada criança"
        :error="errors.idadeMaximaCrianca"
      />
      <UiSelect
        v-model="modoListaConvidados"
        label="Lista de convidados"
        :options="[
          { value: 'fechada', label: 'Fechada (só convidados pré-cadastrados)' },
          { value: 'aberta', label: 'Aberta (permite acompanhante avulso no RSVP)' },
        ]"
        :error="errors.modoListaConvidados"
      />
      <UiInput
        v-model="handleInfinitepay"
        label="InfiniteTag da InfinitePay (opcional)"
        placeholder="seuhandle"
        :error="errors.handleInfinitepay"
      />
      <p class="-mt-2 text-xs text-text-muted">
        Ativa o pagamento online na lista de presentes (Contribuições, Presentes Emocionais e a
        opção de presentear a lista física pagando o valor). Sem isso preenchido, os convidados só
        podem reservar presentes físicos gratuitamente. Informe sua InfiniteTag pública, sem o "$" —
        os métodos de pagamento aceitos (Pix, cartão) são definidos diretamente na sua conta
        InfinitePay, não aqui.
      </p>
      <UiSelect
        v-model="modoEntregaPresenteFisico"
        label="Como presentear a Lista de Presentes física"
        :options="[
          { value: 'ambos', label: 'Convidado escolhe: comprar e entregar, ou pagar online' },
          { value: 'somente_compra_propria', label: 'Só comprar e entregar (sem pagamento online)' },
          { value: 'somente_pagamento', label: 'Só pagamento online (sem opção de entregar)' },
        ]"
        :error="errors.modoEntregaPresenteFisico"
      />

      <div class="flex justify-end">
        <UiButton type="submit" :disabled="isSubmitting">Salvar dados do evento</UiButton>
      </div>
    </form>
  </UiCard>
</template>
