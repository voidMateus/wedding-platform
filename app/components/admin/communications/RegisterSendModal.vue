<!--
  Registrar um envio que aconteceu por fora — com precisão.

  Registrar era um clique só, que gravava canal `outro` com a data de agora e
  não perguntava nada (rodada de usabilidade de 20/09/2026, ponto 24). Para o
  caso comum — "acabei de entregar na mão" — estava certo; para todo o resto,
  gravava três coisas por suposição: o tipo (sempre o que a tela estava
  filtrando), o canal (sempre "outro") e a data (sempre agora).

  **A data é o que mais doía.** O estágio "enviado" do funil mostra há quanto
  tempo o convite foi mandado, e é esse número que diz a quem cobrar resposta.
  Um convite entregue no domingo e registrado na segunda aparecia como "hoje",
  e a cobrança saía um dia atrasada em toda a lista.

  **Nunca para o futuro**, e isso não é detalhe de validação: um envio datado
  adiante entraria no funil como se já tivesse acontecido, e o casal cobraria
  resposta de quem ainda não recebeu nada. O schema recusa.
-->
<script setup lang="ts">
import {
  CANAIS_COMUNICACAO,
  ROTULOS_CANAL_COMUNICACAO,
  ROTULOS_TIPO_COMUNICACAO,
  TIPOS_COMUNICACAO,
  type CanalComunicacao,
  type TipoComunicacao,
} from '#shared/utils/modelo-comunicacao'
import { diaLocal, instanteDoEnvio } from '#shared/utils/data-de-envio'
import { getApiErrorMessage } from '~/utils/api-error'

interface Props {
  open: boolean
  conviteId: string
  /** Para quem — o título do modal diz de quem é o convite. */
  nome: string
  tipoInicial?: TipoComunicacao
  canalInicial?: CanalComunicacao
  convidadoId?: string | null
}

const {
  open,
  conviteId,
  nome,
  tipoInicial = 'convite',
  canalInicial = 'outro',
  convidadoId = null,
} = defineProps<Props>()

const emit = defineEmits<{ close: []; registered: [] }>()

const toast = useToast()
const { registrarEnvio } = useCommunications()

const tipo = ref<TipoComunicacao>(tipoInicial)
const canal = ref<CanalComunicacao>(canalInicial)
const emOutroDia = ref(false)
const dia = ref('')
const enviando = ref(false)

// O modal é montado com `v-if`, mas o pai pode reaproveitá-lo entre linhas:
// sem isto, a segunda abertura herdaria o tipo e a data da primeira.
watch(
  () => open,
  (aberto) => {
    if (!aberto) return
    tipo.value = tipoInicial
    canal.value = canalInicial
    emOutroDia.value = false
    dia.value = ''
  },
)

const opcoesDeTipo = TIPOS_COMUNICACAO.map((valor) => ({
  value: valor,
  label: ROTULOS_TIPO_COMUNICACAO[valor],
}))

/**
 * `email` fica de fora: quem manda e-mail é a plataforma, por rota própria, e
 * o registro nasce do envio de verdade. Registrar um à mão criaria uma linha
 * indistinguível de um envio do sistema — e, pela regra de remoção (só canal
 * `outro` se apaga), uma linha que o casal não conseguiria desfazer.
 */
const opcoesDeCanal = CANAIS_COMUNICACAO.filter((valor) => valor !== 'email').map((valor) => ({
  value: valor,
  label: ROTULOS_CANAL_COMUNICACAO[valor],
}))

const hoje = diaLocal()

/**
 * O futuro é barrado aqui TAMBÉM, e não só no schema: o `UiDatePicker` não tem
 * limite máximo, então sem isto o casal escolheria uma data adiante, clicaria
 * em Registrar e receberia um erro de servidor para um engano que a tela podia
 * ter dito na hora.
 */
const erroDaData = computed(() =>
  emOutroDia.value && dia.value && dia.value > hoje
    ? 'O envio não pode estar no futuro.'
    : undefined,
)

/** Ausente = agora, que é o caso normal (ver `instanteDoEnvio`). */
const enviadoEm = computed(() => (emOutroDia.value ? instanteDoEnvio(dia.value) : undefined))

async function confirmar() {
  enviando.value = true
  try {
    await registrarEnvio({
      conviteId,
      tipo: tipo.value,
      canal: canal.value,
      convidadoId,
      enviadoEm: enviadoEm.value,
    })
    toast.success(`${ROTULOS_TIPO_COMUNICACAO[tipo.value]} registrado.`)
    emit('registered')
    emit('close')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível registrar o envio.'))
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="open"
    title="Registrar envio"
    :description="`O que já foi entregue a ${nome}, por fora da plataforma.`"
    @update:model-value="(valor) => !valor && emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="tipo" label="O que foi enviado" :options="opcoesDeTipo" />
        <UiSelect v-model="canal" label="Por onde" :options="opcoesDeCanal" />
      </div>

      <div class="flex flex-col gap-3 border-t border-border pt-4">
        <UiCheckbox v-model="emOutroDia" label="Foi em outro dia" />
        <UiDatePicker
          v-if="emOutroDia"
          v-model="dia"
          label="Quando"
          :error="erroDaData"
          hint="O funil usa esta data para dizer há quanto tempo o convite foi mandado."
        />
        <p v-else class="text-xs text-text-muted">
          Sem marcar, o envio é registrado com a data de agora.
        </p>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" :disabled="enviando" @click="emit('close')">Cancelar</UiButton>
      <UiButton
        :disabled="enviando || Boolean(erroDaData) || (emOutroDia && !dia)"
        @click="confirmar"
      >
        Registrar
      </UiButton>
    </template>
  </UiModal>
</template>
