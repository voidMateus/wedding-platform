<!--
  Avisos automáticos: os dois únicos envios que a plataforma faz sem ninguém
  clicar.

  Assunto próprio no menu de Configurações, e não mais um cartão em "Geral",
  porque o que se decide aqui é de outra natureza: os outros cartões guardam
  DADOS do evento, este autoriza a plataforma a escrever, em nome do casal,
  para pessoas que não pediram nada. Merece uma tela onde nada mais concorra
  pela atenção — e um formulário próprio, com o próprio salvar.
-->
<script setup lang="ts">
import { LEMBRETES_PADRAO, lembretesDoCasamento } from '#shared/schemas/lembretes'
import type { ConfigLembretes } from '#shared/schemas/lembretes'
import { MAX_MARCAS_LEMBRETE, proximaDataDeLembrete } from '#shared/utils/lembretes'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { formatDatePtBR } from '#shared/utils/format-date'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const { salvarLembretes } = useCommunications()

const salvo = computed<ConfigLembretes>(() => lembretesDoCasamento(props.wedding?.config_lembretes))

const form = ref<ConfigLembretes>(clonar(salvo.value))
watch(salvo, (valor) => {
  form.value = clonar(valor)
})

const sujo = computed(() => JSON.stringify(form.value) !== JSON.stringify(salvo.value))
const salvando = ref(false)

/**
 * As marcas são editadas como texto ("14, 3") em vez de N campos numéricos.
 *
 * Um campo por marca obrigaria a inventar "adicionar marca" e "remover marca"
 * para uma lista de no máximo três números — mais controles do que conteúdo.
 * O que o casal digita é lido como lista; o que não for número inteiro é
 * ignorado, e o schema ainda ordena e remove repetição no servidor.
 */
const marcasRsvp = ref(form.value.rsvp.diasAntes.join(', '))
const marcasPagamentos = ref(form.value.pagamentos.diasAntes.join(', '))

watch(form, (valor) => {
  marcasRsvp.value = valor.rsvp.diasAntes.join(', ')
  marcasPagamentos.value = valor.pagamentos.diasAntes.join(', ')
})

function lerMarcas(texto: string): number[] {
  return [
    ...new Set(
      texto
        .split(/[,;\s]+/)
        .map((parte) => Number.parseInt(parte, 10))
        .filter((numero) => Number.isInteger(numero) && numero >= 0 && numero <= 180),
    ),
  ]
    .sort((a, b) => b - a)
    .slice(0, MAX_MARCAS_LEMBRETE)
}

const hoje = hojeNoFusoDoEvento()

/**
 * "O próximo sai em 6 de outubro" — a tela diz o que vai acontecer ANTES de
 * acontecer. É o que transforma um interruptor numa decisão informada: ligar
 * sem saber a data é ligar no escuro.
 */
const proximoRsvp = computed(() => {
  if (!form.value.rsvp.ativo) return null
  // `prazo_rsvp` é timestamptz e as marcas comparam DATAS. A conversão é no
  // fuso do EVENTO: cortar os 10 primeiros caracteres daria a data em UTC, e
  // um prazo às 23h59 de São Paulo viraria o dia seguinte.
  const prazo = props.wedding?.prazo_rsvp
    ? hojeNoFusoDoEvento(new Date(props.wedding.prazo_rsvp))
    : null
  const data = proximaDataDeLembrete(hoje, prazo, lerMarcas(marcasRsvp.value))
  return data ? formatDatePtBR(data) : null
})

const semPrazo = computed(() => !props.wedding?.prazo_rsvp)

async function salvar() {
  salvando.value = true
  try {
    await salvarLembretes({
      rsvp: { ativo: form.value.rsvp.ativo, diasAntes: lerMarcas(marcasRsvp.value) },
      pagamentos: {
        ativo: form.value.pagamentos.ativo,
        diasAntes: lerMarcas(marcasPagamentos.value),
      },
    })
    toast.success('Avisos automáticos salvos.')
    emit('saved')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível salvar os avisos.'))
  } finally {
    salvando.value = false
  }
}

function descartar() {
  form.value = clonar(salvo.value)
}

function clonar(valor: ConfigLembretes): ConfigLembretes {
  return {
    rsvp: { ...valor.rsvp, diasAntes: [...valor.rsvp.diasAntes] },
    pagamentos: { ...valor.pagamentos, diasAntes: [...valor.pagamentos.diasAntes] },
  }
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="salvar">
    <AdminSettingsSectionCard
      section-id="avisos"
      title="Avisos automáticos"
      description="Os únicos envios que acontecem sem você clicar. Nascem desligados."
    >
      <AdminSettingsToggleRow
        v-model="form.rsvp.ativo"
        icon="lucide:mail-check"
        label="Lembrete de confirmação de presença"
        hint="Por e-mail, para quem já recebeu o convite e ainda não respondeu."
      />

      <UiInput
        v-if="form.rsvp.ativo"
        v-model="marcasRsvp"
        label="Quantos dias antes do prazo"
        :hint="`Até ${MAX_MARCAS_LEMBRETE} marcas, separadas por vírgula. Padrão: ${LEMBRETES_PADRAO.rsvp.diasAntes.join(', ')}.`"
      />

      <!-- Prazo ausente não é erro de preenchimento daqui: é um dado que mora
           em "O evento". Sem ele não existe "antes do prazo", então o aviso
           diz o que falta em vez de o interruptor mentir que está valendo. -->
      <p v-if="form.rsvp.ativo && semPrazo" class="text-sm text-warning">
        Este casamento ainda não tem prazo de RSVP definido — sem ele, nenhum lembrete sai. Defina
        em Geral › O evento.
      </p>
      <p v-else-if="proximoRsvp" class="text-sm text-text-muted">
        Próximo lembrete: <span class="font-medium text-text">{{ proximoRsvp }}</span>
      </p>

      <hr class="border-border" />

      <AdminSettingsToggleRow
        v-model="form.pagamentos.ativo"
        icon="lucide:calendar-clock"
        label="Aviso de pagamento a vencer"
        hint="Para você, não para os convidados: um e-mail com as parcelas que vencem em breve."
      />

      <UiInput
        v-if="form.pagamentos.ativo"
        v-model="marcasPagamentos"
        label="Quantos dias antes do vencimento"
        :hint="`Até ${MAX_MARCAS_LEMBRETE} marcas, separadas por vírgula. Padrão: ${LEMBRETES_PADRAO.pagamentos.diasAntes.join(', ')}.`"
      />

      <template #aside>
        <p>
          O lembrete de RSVP vai para o e-mail de quem responde por cada convite, com o mesmo texto
          que você edita em Comunicações › Mensagens.
        </p>
        <p>
          Ninguém recebe dois lembretes no mesmo dia, e quem já respondeu sai da lista
          automaticamente.
        </p>
        <p>O aviso de pagamento chega para você e para quem tem acesso a este casamento.</p>
      </template>
    </AdminSettingsSectionCard>

    <AdminSettingsSaveBar
      action="Salvar avisos"
      :dirty="sujo"
      :submitting="salvando"
      @discard="descartar"
    />
  </form>
</template>
