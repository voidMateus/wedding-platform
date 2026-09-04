<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { resolverFaixasEtarias } from '#shared/utils/faixa-etaria'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
  /** Dados salvos — o pai recarrega o `wedding` compartilhado (nome/data aparecem na sidebar). */
  saved: []
}>()

/** Hora usada quando o casal escolhe a data do prazo e não mexe no horário. */
const DEFAULT_RSVP_DEADLINE_TIME = '23:59'

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toast = useToast()
const { updateWedding } = useWedding()

const { handleSubmit, defineField, errors, resetForm, isSubmitting, meta } = useForm({
  validationSchema: toTypedSchema(weddingSettingsSchema),
})

const [nomesNoivos] = defineField('nomesNoivos')
const [dataEvento] = defineField('dataEvento')
const [horarioEvento] = defineField('horarioEvento')
const [prazoRsvp] = defineField('prazoRsvp')
const [faixasEtarias] = defineField('faixasEtarias')
const [modoListaConvidados] = defineField('modoListaConvidados')
const [handleInfinitepay] = defineField('handleInfinitepay')
const [modoEntregaPresenteFisico] = defineField('modoEntregaPresenteFisico')

// A validação das faixas é de conjunto (continuidade, sobreposição), então o
// erro pode cair no array inteiro ou num campo dele — a barra de salvamento
// precisa mostrar o primeiro dos dois, qualquer que seja.
const faixasEtariasError = computed(
  () => Object.entries(errors.value).find(([key]) => key.startsWith('faixasEtarias'))?.[1],
)

// O prazo de RSVP é um `datetime-local` no schema (`YYYY-MM-DDTHH:mm`), mas
// na tela são dois controles: UiDatePicker e UiTimePicker. Os proxies abaixo
// costuram os dois de volta numa string só — o schema e o endpoint seguem
// recebendo exatamente o mesmo formato de antes.
const prazoRsvpDate = computed({
  get: () => prazoRsvp.value?.split('T')[0] ?? '',
  set: (value: string) => {
    if (!value) {
      prazoRsvp.value = ''
      return
    }
    prazoRsvp.value = `${value}T${prazoRsvp.value?.split('T')[1] || DEFAULT_RSVP_DEADLINE_TIME}`
  },
})

const prazoRsvpTime = computed({
  get: () => prazoRsvp.value?.split('T')[1] ?? '',
  set: (value: string) => {
    // Horário sem data não forma um prazo — sem data escolhida, ignora.
    const date = prazoRsvp.value?.split('T')[0]
    if (!date) return
    prazoRsvp.value = `${date}T${value || DEFAULT_RSVP_DEADLINE_TIME}`
  },
})

// Serve ao watcher (popular o formulário) e ao "Descartar" da barra de
// salvamento — os dois querem exatamente "voltar ao que está no servidor".
// Como resetForm redefine também os valores iniciais, é isto que zera
// meta.dirty.
function applyWeddingToForm() {
  const value = props.wedding
  if (!value) return
  resetForm({
    values: {
      nomesNoivos: value.nomes_noivos,
      dataEvento: value.data_evento,
      horarioEvento: value.horario_evento ? value.horario_evento.slice(0, 5) : '',
      prazoRsvp: value.prazo_rsvp ? isoToDatetimeLocal(value.prazo_rsvp) : '',
      faixasEtarias: resolverFaixasEtarias(value.config_faixas_etarias),
      modoListaConvidados: value.modo_lista_convidados as 'fechada' | 'aberta',
      handleInfinitepay: value.handle_infinitepay ?? '',
      modoEntregaPresenteFisico: value.modo_entrega_presente_fisico as
        'ambos' | 'somente_compra_propria' | 'somente_pagamento',
    },
  })
}

watch(() => props.wedding, applyWeddingToForm, { immediate: true })

const onSubmit = handleSubmit(
  async (values) => {
    try {
      await updateWedding(values)
      emit('saved')
      toast.success('Configurações salvas.')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar as configurações.'))
    }
  },
  // Ver AppearanceTab: sem este retorno, salvar com campo inválido é um clique
  // que não produz nada nem explica por quê.
  () => {
    toast.error('Há campos que precisam de ajuste nesta aba — confira os destaques acima.')
  },
)
</script>

<template>
  <form class="flex flex-col gap-5" @submit="onSubmit">
    <AdminSettingsSectionCard
      section-id="evento"
      title="O evento"
      description="Informações básicas usadas no site, nos convites e na contagem regressiva."
    >
      <UiInput v-model="nomesNoivos" label="Nome do casal" :error="errors.nomesNoivos" />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiDatePicker v-model="dataEvento" label="Data do casamento" :error="errors.dataEvento" />
        <UiTimePicker
          v-model="horarioEvento"
          label="Horário (opcional)"
          hint="Sem horário definido, a contagem regressiva mira meia-noite do dia do evento."
          :error="errors.horarioEvento"
        />
      </div>
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="rsvp"
      title="RSVP e convidados"
      description="Regras de confirmação de presença e de quem pode responder."
    >
      <AdminSettingsField
        label="Prazo final de RSVP (opcional)"
        hint="Depois desta data e hora, o convidado não consegue mais alterar a resposta. Sem prazo, a confirmação fica aberta até o dia do evento."
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UiDatePicker
            v-model="prazoRsvpDate"
            placeholder="Sem prazo definido"
            clearable
            :error="errors.prazoRsvp"
          />
          <UiTimePicker v-model="prazoRsvpTime" :disabled="!prazoRsvpDate" />
        </div>
      </AdminSettingsField>

      <!-- Duas opções com uma linha de explicação cada: em cartões, as duas
           ficam legíveis de uma vez. Num dropdown, a diferença entre elas só
           aparece depois de abrir a lista. -->
      <UiRadioGroup
        v-model="modoListaConvidados"
        label="Lista de convidados"
        layout="grid"
        :options="[
          {
            value: 'fechada',
            label: 'Fechada',
            icon: 'lucide:lock',
            description: 'Só quem já está cadastrado na sua lista consegue confirmar presença.',
          },
          {
            value: 'aberta',
            label: 'Aberta',
            icon: 'lucide:user-plus',
            description: 'Permite que o convidado inclua um acompanhante avulso no RSVP.',
          },
        ]"
        :error="errors.modoListaConvidados"
      />
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="faixas-etarias"
      title="Classificação etária"
      description="Defina como os convidados serão agrupados por idade."
    >
      <AdminSettingsAgeGroupsField v-model="faixasEtarias" :error="faixasEtariasError" />

      <template #aside>
        <p>
          A faixa de cada convidado nunca é gravada: ela é calculada a partir da idade que a pessoa
          terá na data do casamento. A mesma pessoa pode ser criança aqui e adolescente em outro
          evento com limites diferentes.
        </p>
        <p>
          Para quem você não sabe a data de nascimento, informe a faixa à mão no cadastro do
          convidado. Se a data de nascimento for preenchida depois, ela passa a valer.
        </p>
      </template>
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="pagamentos"
      title="Presentes e pagamentos"
      description="Conecte sua conta para receber contribuições online."
    >
      <UiInput
        v-model="handleInfinitepay"
        label="InfiniteTag da InfinitePay (opcional)"
        placeholder="seuhandle"
        :error="errors.handleInfinitepay"
      />
      <UiSelect
        v-model="modoEntregaPresenteFisico"
        label="Como presentear a Lista de Presentes física"
        :options="[
          { value: 'ambos', label: 'Convidado escolhe: comprar e entregar, ou pagar online' },
          {
            value: 'somente_compra_propria',
            label: 'Só comprar e entregar (sem pagamento online)',
          },
          { value: 'somente_pagamento', label: 'Só pagamento online (sem opção de entregar)' },
        ]"
        :error="errors.modoEntregaPresenteFisico"
      />

      <template #aside>
        <p>
          Com a InfiniteTag preenchida, a lista de presentes libera Contribuições, Presentes
          Emocionais e a opção de presentear a lista física pagando o valor.
        </p>
        <p>
          Sem ela, os convidados só reservam presentes físicos gratuitamente. Informe sua
          InfiniteTag pública, sem o "$".
        </p>
        <p>
          Os métodos de pagamento aceitos (Pix, cartão) são definidos diretamente na sua conta
          InfinitePay, não aqui.
        </p>
      </template>
    </AdminSettingsSectionCard>

    <AdminSettingsSaveBar
      action="Salvar dados do evento"
      :dirty="meta.dirty"
      :submitting="isSubmitting"
      @discard="applyWeddingToForm"
    />
  </form>
</template>
