<script setup lang="ts">
import { ROTULOS_TIPO_COMUNICACAO, TIPOS_COMUNICACAO } from '#shared/utils/modelo-comunicacao'
import type { TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import { formatarTempoDecorrido } from '#shared/utils/format-date'
import type { CanalDeEnvio, EnvioRegistrado, LinhaDeComunicacao } from '~/types/comunicacao'
import { applyTableFilters } from '~/utils/table-rows'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const toast = useToast()

const { listCommunications, prepararMensagem, registrarEnvio, enviarPorEmail } = useCommunications()
const { data, status, error, refresh } = listCommunications()

const linhas = computed(() => data.value?.data ?? [])
const resumo = computed(() => data.value?.resumo ?? null)

/**
 * O canal só aparece quando existe: sem provedor configurado no ambiente, o
 * WhatsApp é o único caminho e um seletor de uma opção só é ruído. É a mesma
 * regra da busca de locais (`placesSearchEnabled`) — o recurso some da tela em
 * vez de falhar nela.
 */
const emailDisponivel = useRuntimeConfig().public.emailEnabled
const canalEmEnvio = ref<CanalDeEnvio>('whatsapp')

const { colunas, acessores, rotuloDoEnvio } = useCommunicationColumns(canalEmEnvio)
const filters = useTableFilters(colunas)

const linhasFiltradas = computed(() =>
  applyTableFilters(linhas.value, colunas.value, acessores.value, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

/**
 * O tipo que o casal está mandando AGORA, e que governa o botão de cada linha.
 *
 * Um seletor no topo em vez de três botões por linha: mandar convite é uma
 * sessão de trabalho ("hoje eu mando os convites"), não uma escolha que se
 * refaz oitenta vezes. Os três botões por linha também não caberiam sem
 * espremer o resto.
 */
const tipoEmEnvio = ref<TipoComunicacao>('convite')
const opcoesDeTipo = TIPOS_COMUNICACAO.map((valor) => ({
  value: valor,
  label: ROTULOS_TIPO_COMUNICACAO[valor],
}))

const opcoesDeCanal = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
]

const faltamDoTipo = computed(
  () => linhas.value.filter((linha) => !linha.envios[tipoEmEnvio.value]).length,
)

/**
 * Quem ainda não tem registro do tipo em envio — a fila, e ela é DERIVADA.
 *
 * Nada é salvo: fechar a fila não perde nada e reabrir recalcula do zero. Um
 * estado salvo precisaria ser reconciliado toda vez que um envio acontecesse
 * por outro caminho (pela linha da tabela, pela ficha do convite).
 */
const pendentesDoTipo = computed(() =>
  linhas.value.filter((linha) => !linha.envios[tipoEmEnvio.value]),
)

const filaAberta = ref(false)
/** Congelado na abertura: o denominador não pode encolher junto com a fila. */
const totalDaFila = ref(0)

function abrirFila() {
  totalDaFila.value = pendentesDoTipo.value.length
  filaAberta.value = true
}

const linhaEmRegistro = ref<LinhaDeComunicacao | null>(null)

function abrirRegistro(linha: LinhaDeComunicacao) {
  linhaEmRegistro.value = linha
}

/**
 * As ações que não cabem no botão principal da linha.
 *
 * "Abrir convite" existe porque a tela mandava sem nunca deixar VER: o casal
 * não tinha como conferir o que o convidado recebe sem sair da lista e
 * procurar o convite (rodada de usabilidade de 20/09/2026, ponto 24).
 */
const ACOES_DA_LINHA = [
  { key: 'registrar', label: 'Registrar com data…', icon: 'lucide:calendar-check' },
  { key: 'abrir', label: 'Abrir convite', icon: 'lucide:external-link' },
] as const

function executarAcao(chave: string, linha: LinhaDeComunicacao) {
  if (chave === 'registrar') return abrirRegistro(linha)
  if (chave === 'abrir') return navigateTo(`/admin/${slug}/convites/${linha.id}`)
}

/** Quantos não dá para alcançar pelo canal de agora — o número muda com ele. */
const semContato = computed(() =>
  canalEmEnvio.value === 'email' ? (resumo.value?.semEmail ?? 0) : (resumo.value?.semTelefone ?? 0),
)

const isFirstLoad = computed(() => status.value === 'pending' && !data.value)
const isRefreshing = computed(() => status.value === 'pending' && Boolean(data.value))

const enviandoId = ref<string | null>(null)

/**
 * Abre o WhatsApp com a mensagem pronta e registra o envio no mesmo gesto.
 *
 * **A aba é aberta ANTES do await**, vazia, e só depois recebe o endereço.
 * Navegador só permite abrir aba durante o gesto do usuário; abrir depois da
 * resposta do servidor cairia direto no bloqueador de pop-up, e o casal veria
 * "enviado" sem nada ter aberto. É por isso que a referência à janela é
 * guardada aqui e o `location` é atribuído depois.
 *
 * **Abrir o WhatsApp É a declaração de envio** (decisão de 2026-09-13): o
 * registro é gravado junto, com desfazer disponível na Linha do Tempo do
 * convite. Voltar da aba do WhatsApp para confirmar cada um dobraria o número
 * de gestos numa tarefa que se faz oitenta vezes — e o sistema nunca comprovou
 * entrega, nem antes.
 */
async function enviarPorWhatsApp(linha: LinhaDeComunicacao) {
  if (!linha.telefoneE164) return

  const aba = window.open('', '_blank')
  enviandoId.value = linha.id

  try {
    const mensagem = await prepararMensagem({
      conviteId: linha.id,
      tipo: tipoEmEnvio.value,
    })

    if (!mensagem.linkWhatsApp) {
      aba?.close()
      toast.error('Não foi possível montar a mensagem para este convite.')
      return
    }

    if (aba) aba.location.href = mensagem.linkWhatsApp
    // Sem a aba (bloqueador agressivo), o envio não aconteceu — registrar aqui
    // marcaria como enviado algo que o casal nunca chegou a mandar.
    else {
      toast.error('O navegador bloqueou a abertura do WhatsApp. Libere os pop-ups e tente de novo.')
      return
    }

    await registrarEnvio({
      conviteId: linha.id,
      tipo: tipoEmEnvio.value,
      canal: 'whatsapp',
      convidadoId: linha.responsavel?.id ?? null,
    })
    await refresh()
  } catch (err) {
    aba?.close()
    toast.error(getApiErrorMessage(err, 'Não foi possível preparar o envio.'))
  } finally {
    enviandoId.value = null
  }
}

/**
 * O e-mail sai pelo servidor, então aqui não há aba a abrir nem gesto a
 * preservar — e, ao contrário do WhatsApp, o envio é confirmado de verdade: só
 * há registro se o provedor aceitou a mensagem.
 */
async function enviarPorEmailDaLinha(linha: LinhaDeComunicacao) {
  if (!linha.email) return

  enviandoId.value = linha.id
  try {
    const envio = await enviarPorEmail({ conviteId: linha.id, tipo: tipoEmEnvio.value })
    await refresh()
    toast.success(`${ROTULOS_TIPO_COMUNICACAO[envio.tipo]} enviado para ${envio.destinatario}.`)
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível enviar o e-mail.'))
  } finally {
    enviandoId.value = null
  }
}

/** O botão da linha faz o que o canal de agora manda. */
async function enviarDaLinha(linha: LinhaDeComunicacao) {
  if (canalEmEnvio.value === 'email') return enviarPorEmailDaLinha(linha)
  return enviarPorWhatsApp(linha)
}

/** Quem não tem telefone: o envio aconteceu por fora, e o casal só anota. */
async function registrarPorFora(linha: LinhaDeComunicacao) {
  enviandoId.value = linha.id
  try {
    await registrarEnvio({
      conviteId: linha.id,
      tipo: tipoEmEnvio.value,
      canal: 'outro',
    })
    await refresh()
    toast.success(`${ROTULOS_TIPO_COMUNICACAO[tipoEmEnvio.value]} registrado.`)
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível registrar o envio.'))
  } finally {
    enviandoId.value = null
  }
}

/**
 * Só devolvido e reclamado pedem providência do casal.
 *
 * `enviado` é o estado normal de quase todo envio (o provedor só avisa quando
 * confirma entrega ou quando algo dá errado), e `adiado` costuma resolver-se
 * sozinho na retentativa — sinalizar os dois encheria a tela de alarme falso.
 */
function precisaDeAtencao(envio: EnvioRegistrado | null): boolean {
  return envio?.entrega === 'devolvido' || envio?.entrega === 'reclamado'
}

const isTemplatesOpen = ref(false)

/** Leva para a lista de convidados filtrada por quem ainda não tem contato. */
const linkParaContatos = `/admin/${slug}/convidados`
const linkParaAvisos = `/admin/${slug}/configuracoes?secao=avisos`
</script>

<template>
  <AdminSection title="Comunicações" :meta="resumo ? `${resumo.total} convites` : undefined">
    <template #actions>
      <!-- Só aparece quando existe canal automático: sem provedor de e-mail,
           nada nesta plataforma manda nada sozinho, e oferecer a tela de
           avisos seria prometer o que não acontece. -->
      <UiButton v-if="emailDisponivel" variant="ghost" :to="linkParaAvisos">
        <Icon name="lucide:bell" class="h-4 w-4" />
        Avisos automáticos
      </UiButton>
      <UiButton variant="ghost" @click="isTemplatesOpen = true">
        <Icon name="lucide:message-square-text" class="h-4 w-4" />
        Mensagens
      </UiButton>
    </template>

    <!-- O resumo descreve o casamento inteiro, nunca o recorte da tela: "12 sem
         telefone" não pode mudar porque um filtro está ativo. -->
    <div
      v-if="resumo"
      class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted"
    >
      <span>
        <span class="num font-medium text-text">{{ resumo.comConviteEnviado }}</span>
        de {{ resumo.total }} já receberam o convite
      </span>
      <span v-if="resumo.semNenhumEnvio">
        ·
        <span class="num font-medium text-text">{{ resumo.semNenhumEnvio }}</span>
        sem nenhum contato
      </span>
      <!-- Convite sem contato não é erro, é trabalho a fazer — e o atalho leva
           direto para onde se completa o cadastro. O número segue o canal: o
           mesmo convite pode ter e-mail e não ter telefone. -->
      <NuxtLink
        v-if="semContato"
        :to="linkParaContatos"
        class="text-warning underline-offset-2 hover:underline"
      >
        {{ semContato }}
        {{ canalEmEnvio === 'email' ? 'sem e-mail' : 'sem telefone' }} — completar contatos
      </NuxtLink>
      <!-- Devolvido é o único estado que o sistema sabe e o casal não: o
           e-mail saiu, voltou, e ninguém o avisaria sem esta linha. -->
      <span v-if="resumo.naoEntregues" class="text-danger">
        ·
        <span class="num font-medium">{{ resumo.naoEntregues }}</span>
        não chegaram
      </span>
    </div>

    <AdminPanel
      title="Envios"
      :meta="`${linhasFiltradas.length} exibidos · faltam ${faltamDoTipo} de ${ROTULOS_TIPO_COMUNICACAO[tipoEmEnvio].toLowerCase()}`"
    >
      <template #headerActions>
        <!-- Dois seletores, e não um botão por canal em cada linha: mandar
             convite é uma sessão de trabalho ("hoje eu mando os convites, por
             e-mail"), e o par tipo + canal descreve essa sessão inteira. -->
        <UiSelect
          v-if="emailDisponivel"
          v-model="canalEmEnvio"
          :options="opcoesDeCanal"
          aria-label="Por onde enviar"
          class="w-36"
        />
        <UiSelect
          v-model="tipoEmEnvio"
          :options="opcoesDeTipo"
          aria-label="O que você está enviando"
          class="w-44"
        />
        <!-- A fila não manda nada sozinha: ela dá ORDEM a uma sessão de
             oitenta convites, um gesto humano por vez. Disparo em massa exige
             a API oficial do WhatsApp Business, que é decisão comercial e está
             fora desta fase, nomeada no plano. -->
        <UiButton v-if="pendentesDoTipo.length" size="sm" @click="abrirFila">
          <Icon name="lucide:list-checks" class="h-4 w-4" />
          Enviar para os que faltam
          <span class="num">({{ pendentesDoTipo.length }})</span>
        </UiButton>
      </template>

      <div v-if="isFirstLoad" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:triangle-alert"
          title="Não foi possível carregar os envios"
          description="Tente novamente em alguns instantes."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <div v-else-if="!linhas.length" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:send"
          title="Nenhum convite para enviar ainda"
          description="Convites nascem ao cadastrar convidados. Depois, é daqui que você manda o save the date, o convite e os lembretes."
        />
      </div>

      <div v-else :class="isRefreshing && 'opacity-95'" class="transition-brand">
        <AdminTable
          :columns="colunas"
          :rows="linhasFiltradas"
          :filters="filters"
          empty-label="Nenhum convite com esse recorte."
        >
          <template #cell-nome="{ row }">
            <span class="font-medium text-text">{{ row.nome }}</span>
            <span class="ml-2 text-xs text-text-muted">
              {{ row.totalMembros }} {{ row.totalMembros === 1 ? 'pessoa' : 'pessoas' }}
            </span>
          </template>

          <!-- O nome de quem responde, não o telefone: número em tabela é ruído,
               e o que o casal precisa saber é SE dá para mandar. -->
          <template #cell-contato="{ row }">
            <span v-if="temContato(row, canalEmEnvio)" class="text-text-muted">
              {{ row.responsavel?.nomeCompleto ?? '—' }}
            </span>
            <!-- Não é estado terminal: o que falta é um dado que se completa
                 na ficha do convite, e o link leva direto até ela. Antes, a
                 palavra ficava ali sem dizer o que fazer com ela. -->
            <NuxtLink
              v-else
              :to="`/admin/${slug}/convites/${row.id}`"
              class="text-warning underline-offset-4 hover:underline"
            >
              {{ canalEmEnvio === 'email' ? 'Sem e-mail' : 'Sem telefone' }}
            </NuxtLink>
          </template>

          <template v-for="tipo in TIPOS_COMUNICACAO" :key="tipo" #[`cell-${tipo}`]="{ row }">
            <span :class="row.envios[tipo] ? 'text-text-muted' : 'text-text-muted/60'">
              {{ rotuloDoEnvio(row, tipo) }}
            </span>
            <!-- Só o que voltou ganha destaque. "Entregue" e "enviado" não
                 viram selo: a tela ficaria coberta de confirmações de que o
                 normal aconteceu. -->
            <span
              v-if="precisaDeAtencao(row.envios[tipo])"
              class="ml-2 text-xs font-medium text-danger"
            >
              {{ row.envios[tipo]?.entrega === 'reclamado' ? 'marcado como spam' : 'não chegou' }}
            </span>
          </template>

          <template #cell-acoes="{ row }">
            <UiButton
              v-if="temContato(row, canalEmEnvio)"
              size="sm"
              variant="ghost"
              :disabled="enviandoId === row.id"
              :aria-label="`Enviar ${ROTULOS_TIPO_COMUNICACAO[tipoEmEnvio].toLowerCase()} para ${row.nome} por ${canalEmEnvio === 'email' ? 'e-mail' : 'WhatsApp'}`"
              @click="enviarDaLinha(row)"
            >
              <Icon
                :name="canalEmEnvio === 'email' ? 'lucide:mail' : 'lucide:message-circle'"
                class="h-4 w-4"
              />
              Enviar
            </UiButton>
            <!-- Sem telefone o botão não some: o envio aconteceu de outro jeito
                 (papel, mão, cerimonialista) e registrar isso é caminho de
                 primeira classe, não concessão. -->
            <UiButton
              v-else
              size="sm"
              variant="ghost"
              :disabled="enviandoId === row.id"
              :aria-label="`Registrar ${ROTULOS_TIPO_COMUNICACAO[tipoEmEnvio].toLowerCase()} entregue a ${row.nome} por fora`"
              @click="registrarPorFora(row)"
            >
              <Icon name="lucide:check" class="h-4 w-4" />
              Registrar
            </UiButton>
            <AdminRowMenu
              :items="ACOES_DA_LINHA"
              :label="`Ações de ${row.nome}`"
              @select="(chave) => executarAcao(chave, row)"
            />
          </template>

          <template #stacked="{ row }">
            <div class="flex items-start gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-text">{{ row.nome }}</span>
                <span class="mt-0.5 block text-xs text-text-muted">
                  {{ rotuloDoEnvio(row, tipoEmEnvio) }}
                  <template v-if="row.ultimoContato">
                    · último contato {{ formatarTempoDecorrido(row.ultimoContato) }}
                  </template>
                </span>
              </div>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="enviandoId === row.id"
                @click="temContato(row, canalEmEnvio) ? enviarDaLinha(row) : registrarPorFora(row)"
              >
                {{ temContato(row, canalEmEnvio) ? 'Enviar' : 'Registrar' }}
              </UiButton>
            </div>
          </template>
        </AdminTable>
      </div>
    </AdminPanel>

    <AdminCommunicationsTemplatesModal
      v-if="isTemplatesOpen"
      :open="isTemplatesOpen"
      @close="isTemplatesOpen = false"
    />

    <AdminCommunicationsRegisterSendModal
      v-if="linhaEmRegistro"
      :open="Boolean(linhaEmRegistro)"
      :convite-id="linhaEmRegistro.id"
      :nome="linhaEmRegistro.nome"
      :tipo-inicial="tipoEmEnvio"
      :convidado-id="linhaEmRegistro.responsavel?.id ?? null"
      @close="linhaEmRegistro = null"
      @registered="refresh()"
    />

    <AdminCommunicationsSendQueueModal
      v-if="filaAberta"
      :open="filaAberta"
      :pendentes="pendentesDoTipo"
      :total-inicial="totalDaFila"
      :tipo="tipoEmEnvio"
      :canal="canalEmEnvio"
      :ocupado="Boolean(enviandoId)"
      :tem-contato="(linha) => temContato(linha, canalEmEnvio)"
      @close="filaAberta = false"
      @enviar="enviarDaLinha"
      @registrar="registrarPorFora"
    />
  </AdminSection>
</template>
