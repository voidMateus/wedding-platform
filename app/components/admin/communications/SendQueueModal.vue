<!--
  A fila de envio — um convite por vez, com o progresso à vista.

  Mandar oitenta convites é uma sessão de trabalho, e a tela não dava ritmo
  nenhum a ela: a lista mostrava todo mundo, misturando quem já recebeu com
  quem falta, e quem mandava precisava procurar a próxima linha a cada volta do
  WhatsApp (rodada de usabilidade de 20/09/2026, ponto 24).

  **A fila é DERIVADA, nunca salva.** Ela é a lista de quem ainda não tem
  registro daquele tipo — a mesma conta que a tela já faz. Por isso ela é
  interrompível e retomável de graça: fechar o modal não perde nada, e reabrir
  recalcula do zero. Um estado salvo precisaria ser reconciliado com a
  realidade toda vez que um envio acontecesse por outro caminho.

  **Nada aqui manda mensagem.** O envio continua sendo o mesmo gesto humano da
  linha da tabela — abrir o WhatsApp com o texto pronto, um por convite. Não há
  disparo em massa, e não há como haver sem a API oficial do WhatsApp Business
  (conta verificada, templates aprovados, custo por conversa). O que a fila
  acrescenta é ORDEM, não automação.
-->
<script setup lang="ts">
import { ROTULOS_TIPO_COMUNICACAO, type TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import type { CanalDeEnvio, LinhaDeComunicacao } from '~/types/comunicacao'

interface Props {
  open: boolean
  /** Quem ainda não tem registro — recalculado pelo pai a cada envio. */
  pendentes: readonly LinhaDeComunicacao[]
  /** Quantos faltavam quando a fila abriu, para o progresso não encolher junto. */
  totalInicial: number
  tipo: TipoComunicacao
  canal: CanalDeEnvio
  /** Um envio em voo — trava os botões sem fechar a fila. */
  ocupado: boolean
  /** Diz se dá para mandar pelo canal atual (tem telefone, tem e-mail). */
  temContato: (linha: LinhaDeComunicacao) => boolean
}

const { open, pendentes, totalInicial, tipo, canal, ocupado, temContato } = defineProps<Props>()

const emit = defineEmits<{
  close: []
  enviar: [linha: LinhaDeComunicacao]
  registrar: [linha: LinhaDeComunicacao]
}>()

/**
 * Quem foi pulado nesta sessão.
 *
 * Só aqui, e não no banco: "deixar para depois" é uma decisão do momento, e
 * gravá-la faria o convite sumir da fila amanhã sem que nada tivesse
 * acontecido com ele.
 */
const pulados = ref(new Set<string>())

watch(
  () => open,
  (aberto) => {
    if (aberto) pulados.value = new Set()
  },
)

const atual = computed(() => pendentes.find((linha) => !pulados.value.has(linha.id)) ?? null)

const feitos = computed(() => Math.max(0, totalInicial - pendentes.length))
const posicao = computed(() => Math.min(totalInicial, feitos.value + 1))

const terminou = computed(() => pendentes.length === 0)
const soSobraramPulados = computed(() => !terminou.value && atual.value === null)

function pular() {
  if (atual.value) pulados.value = new Set(pulados.value).add(atual.value.id)
}
</script>

<template>
  <UiModal
    :model-value="open"
    :title="`Enviar ${ROTULOS_TIPO_COMUNICACAO[tipo].toLowerCase()}`"
    @update:model-value="(valor) => !valor && emit('close')"
  >
    <div class="flex flex-col gap-5">
      <!-- O progresso primeiro: é ele que transforma uma pilha de oitenta
           convites em algo que se vê andar. -->
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-sm font-medium text-text">
            <template v-if="terminou">Tudo enviado</template>
            <template v-else>{{ posicao }} de {{ totalInicial }}</template>
          </span>
          <span class="text-xs text-text-muted">{{ feitos }} registrados agora</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            class="h-full rounded-full bg-primary transition-brand"
            :style="{ width: `${totalInicial ? (feitos / totalInicial) * 100 : 100}%` }"
          />
        </div>
      </div>

      <UiEmptyState
        v-if="terminou"
        icon="lucide:check-circle-2"
        title="Não falta ninguém"
        :description="`Todos os convites já têm registro de ${ROTULOS_TIPO_COMUNICACAO[tipo].toLowerCase()}.`"
      />

      <UiEmptyState
        v-else-if="soSobraramPulados"
        icon="lucide:clock"
        title="Só sobraram os que você pulou"
        description="Eles continuam na lista — feche a fila e volte quando quiser."
      />

      <div v-else-if="atual" class="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div class="flex flex-col gap-1">
          <span class="font-display text-lg font-semibold text-text">{{ atual.nome }}</span>
          <span v-if="temContato(atual)" class="text-sm text-text-muted">
            {{ atual.responsavel?.nomeCompleto ?? 'Responsável não definido' }}
          </span>
          <!-- Sem contato não é fim de linha: o envio aconteceu de outro jeito
               (papel, mão, cerimonialista) e registrar isso é caminho de
               primeira classe. -->
          <span v-else class="text-sm text-warning">
            {{ canal === 'email' ? 'Sem e-mail cadastrado' : 'Sem telefone cadastrado' }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <UiButton v-if="temContato(atual)" :disabled="ocupado" @click="emit('enviar', atual)">
            <Icon
              :name="canal === 'email' ? 'lucide:mail' : 'lucide:message-circle'"
              class="h-4 w-4"
            />
            {{ canal === 'email' ? 'Enviar e-mail' : 'Abrir WhatsApp' }}
          </UiButton>
          <UiButton variant="ghost" :disabled="ocupado" @click="emit('registrar', atual)">
            <Icon name="lucide:check" class="h-4 w-4" />
            Registrar entregue
          </UiButton>
          <UiButton variant="ghost" :disabled="ocupado" @click="pular">Pular</UiButton>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">
        {{ terminou ? 'Fechar' : 'Parar por aqui' }}
      </UiButton>
    </template>
  </UiModal>
</template>
