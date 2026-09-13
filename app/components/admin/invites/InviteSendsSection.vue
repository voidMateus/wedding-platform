<!--
  Os envios de um convite: o que já foi mandado, por onde, e como registrar
  mais um.

  Substitui o botão "Marcar como enviado" do cabeçalho, que gravava
  `convites.enviado_em` à mão. O fato passou a ter uma linha própria
  (`comunicacoes`), com tipo e canal — porque um convite recebe save the date,
  convite e lembrete, três envios que um timestamp só não sabia distinguir.

  Componente self-contained, que chama as próprias mutações (CLAUDE.md seção 9
  permite): registrar e desfazer são ações desta seção, e o pai só precisa
  saber que algo mudou para recarregar o convite.
-->
<script setup lang="ts">
import {
  CANAIS_COMUNICACAO,
  ROTULOS_CANAL_COMUNICACAO,
  ROTULOS_TIPO_COMUNICACAO,
  TIPOS_COMUNICACAO,
} from '#shared/utils/modelo-comunicacao'
import type { CanalComunicacao, TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import { formatDatePtBR } from '#shared/utils/format-date'
import type { InviteDetail } from '~/types/invite'

interface Props {
  inviteId: string
  envios: InviteDetail['envios']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Um envio foi registrado ou desfeito — o pai recarrega o convite. */
  changed: []
}>()

const { registrarEnvio, apagarEnvio } = useCommunications()
const toast = useToast()

const isBusy = ref(false)
const registrando = ref(false)
const tipo = ref<TipoComunicacao>('convite')
const canal = ref<CanalComunicacao>('outro')

const opcoesDeTipo = TIPOS_COMUNICACAO.map((valor) => ({
  value: valor,
  label: ROTULOS_TIPO_COMUNICACAO[valor],
}))

/**
 * O canal `email` fica de fora daqui: a plataforma ainda não manda e-mail, e
 * oferecer o valor faria o casal registrar um envio que nunca aconteceu por
 * este caminho. WhatsApp aparece porque a tela de Comunicações grava por lá —
 * aqui ele é o registro de "mandei por fora, pelo meu WhatsApp".
 */
const opcoesDeCanal = CANAIS_COMUNICACAO.filter((valor) => valor !== 'email').map((valor) => ({
  value: valor,
  label: ROTULOS_CANAL_COMUNICACAO[valor],
}))

function rotuloDoEnvio(envio: InviteDetail['envios'][number]): string {
  return `${ROTULOS_TIPO_COMUNICACAO[envio.tipo]} · ${ROTULOS_CANAL_COMUNICACAO[envio.canal]}`
}

async function confirmarRegistro() {
  isBusy.value = true
  try {
    await registrarEnvio({ conviteId: props.inviteId, tipo: tipo.value, canal: canal.value })
    registrando.value = false
    toast.success('Envio registrado.')
    emit('changed')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível registrar o envio.'))
  } finally {
    isBusy.value = false
  }
}

/**
 * Só aparece em registro de canal `outro`, e o servidor recusa o resto com 409.
 * A assimetria é a mesma de "Aberto é o único estágio comprovado pelo sistema":
 * declaração do casal tem volta, fato do sistema não.
 */
async function desfazer(id: string) {
  isBusy.value = true
  try {
    await apagarEnvio(id)
    toast.success('Registro desfeito.')
    emit('changed')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível desfazer o registro.'))
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <AdminInvitesInviteSection title="Envios">
    <template #actions>
      <UiButton
        v-if="!registrando"
        size="sm"
        variant="ghost"
        :disabled="isBusy"
        @click="registrando = true"
      >
        <Icon name="lucide:send" class="h-4 w-4" />
        Registrar envio
      </UiButton>
    </template>

    <!-- Registro inline, não um segundo modal: o detalhe do convite já é um
         modal, e empilhar diálogo sobre diálogo embaralha foco e ESC. Mesmo
         desenho da confirmação de arquivar. -->
    <div
      v-if="registrando"
      class="mb-3 flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface-muted p-3"
    >
      <UiSelect v-model="tipo" label="O que" :options="opcoesDeTipo" class="w-40" />
      <UiSelect v-model="canal" label="Por onde" :options="opcoesDeCanal" class="w-36" />
      <UiButton size="sm" :disabled="isBusy" @click="confirmarRegistro">Registrar</UiButton>
      <UiButton size="sm" variant="ghost" :disabled="isBusy" @click="registrando = false">
        Cancelar
      </UiButton>
    </div>

    <!-- A ausência é informação: "nenhum envio registrado" é o estágio "Não
         enviado" do funil dito por extenso, e a providência vem junto. -->
    <p v-if="!envios.length" class="text-sm text-text-muted">
      Nenhum envio registrado. Registre aqui o que foi entregue por fora, ou mande pelo WhatsApp em
      Comunicações.
    </p>

    <ul v-else class="flex flex-col divide-y divide-border">
      <li v-for="envio in envios" :key="envio.id" class="flex items-center gap-3 py-2 text-sm">
        <span class="text-text">{{ rotuloDoEnvio(envio) }}</span>
        <span class="text-text-muted">{{ formatDatePtBR(envio.enviadoEm) }}</span>
        <UiButton
          v-if="envio.canal === 'outro'"
          size="sm"
          variant="ghost"
          class="ml-auto"
          :disabled="isBusy"
          @click="desfazer(envio.id)"
        >
          Desfazer
        </UiButton>
      </li>
    </ul>
  </AdminInvitesInviteSection>
</template>
