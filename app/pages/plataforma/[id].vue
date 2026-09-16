<script setup lang="ts">
import { HORAS_DE_ACESSO_DE_SUPORTE } from '#shared/acesso-de-suporte'
import { rotuloDoPapel, PAPEIS_DE_MEMBRO, type PapelDeMembro } from '#shared/papeis-de-membro'
import { formatarBytes } from '#shared/utils/bytes'
import { formatDatePtBR } from '#shared/utils/format-date'
import { getApiErrorMessage } from '~/utils/api-error'

// A ficha de um casamento (docs/fase5-multievento.md 6.6) — rota própria, e
// não mais campos na linha da tabela, pelo mesmo motivo que a ficha do gasto é
// uma página no Financeiro: o que a equipe precisa saber sobre um evento não
// cabe numa célula.
//
// A casca é a mesma da ficha do gasto: `AdminSection` no topo (título, o que
// identifica o registro e as duas ações que valem para ele inteiro) e um
// `AdminPanel` por assunto. Eram `UiCard`s com um `<h2>` de 14px dentro, que
// é o cartão premium do site público fazendo papel de painel de dados.
definePageMeta({ layout: 'plataforma' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const id = computed(() => String(route.params.id ?? ''))
const {
  getWedding,
  updateWedding,
  deleteWedding,
  addMember,
  removeMember,
  abrirAcessoDeSuporte,
  encerrarAcessoDeSuporte,
} = usePlatformOverview()
const { data, status, error, refresh } = getWedding(id)

const casamento = computed(() => data.value?.data ?? null)

/** A linha de identificação do registro, ao lado do título. */
const meta = computed(() => {
  if (!casamento.value) return undefined
  return `/${casamento.value.slug} · ${formatDatePtBR(casamento.value.dataEvento)}`
})

const metricas = computed(() => {
  if (!casamento.value) return []
  return [
    { label: 'Convidados', value: casamento.value.contagemConvidados },
    { label: 'Convites enviados', value: casamento.value.convitesEnviados },
    { label: 'Credenciais ativas', value: casamento.value.credenciaisAtivas },
    { label: 'Storage', value: formatarBytes(casamento.value.storageBytes), destaque: true },
  ]
})

// --- edição dos dados do evento ------------------------------------------
const editando = ref(false)
const salvando = ref(false)
const form = reactive({ nomesNoivos: '', dataEvento: '', slug: '' })

function abrirEdicao() {
  if (!casamento.value) return
  form.nomesNoivos = casamento.value.nomesNoivos
  form.dataEvento = casamento.value.dataEvento
  form.slug = casamento.value.slug
  editando.value = true
}

/**
 * `?editar=1` abre a ficha já no formulário — é assim que o menu da listagem
 * manda alguém direto para a edição, no mesmo padrão de estado governado pela
 * URL que o resto do painel usa.
 *
 * A query é consumida assim que abre: deixá-la na barra faria "Cancelar"
 * reabrir o formulário a cada recarregamento, e o compartilhamento do link
 * levaria outra pessoa a um formulário aberto sem ela ter pedido.
 */
watch(
  [casamento, () => route.query.editar],
  ([carregado, editar]) => {
    if (!carregado || editar !== '1' || editando.value) return
    abrirEdicao()
    router.replace({ query: {} })
  },
  { immediate: true },
)

const slugMudou = computed(() => Boolean(casamento.value) && form.slug !== casamento.value?.slug)

/**
 * O que quebra ao trocar o endereço. O link do convidado é
 * `/{slug}/rsvp/{código}`, então o número de convites já enviados é a medida
 * exata do estrago — e um QR impresso não se reimprime.
 */
const avisoDoSlug = computed(() => {
  if (!slugMudou.value || !casamento.value) return null

  const { convitesEnviados, credenciaisAtivas } = casamento.value
  if (convitesEnviados === 0 && credenciaisAtivas === 0) {
    return 'Nada foi enviado ainda neste casamento — trocar o endereço agora não quebra link nenhum.'
  }

  const partes: string[] = []
  if (convitesEnviados > 0) {
    partes.push(
      `${convitesEnviados} ${convitesEnviados === 1 ? 'convite já saiu' : 'convites já saíram'}`,
    )
  }
  if (credenciaisAtivas > 0) {
    partes.push(
      `${credenciaisAtivas} ${credenciaisAtivas === 1 ? 'credencial ativa' : 'credenciais ativas'}`,
    )
  }

  return `${partes.join(' e ')}. Todo link e QR já compartilhado para de funcionar, e não há como reimprimir um QR que já está na mão de alguém.`
})

/** O aviso só é perigo quando existe algo a quebrar. */
const slugQuebraAlgo = computed(
  () => Boolean(casamento.value?.convitesEnviados) || Boolean(casamento.value?.credenciaisAtivas),
)

async function salvar() {
  if (!casamento.value) return
  salvando.value = true
  try {
    await updateWedding(id.value, {
      nomesNoivos: form.nomesNoivos,
      dataEvento: form.dataEvento,
      slug: form.slug,
    })
    toast.success('Casamento atualizado.')
    editando.value = false
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível salvar.'))
  } finally {
    salvando.value = false
  }
}

// --- ciclo de vida --------------------------------------------------------
const arquivando = ref(false)
const arquivado = computed(() => casamento.value?.statusCicloVida === 'arquivado')

async function alternarArquivamento() {
  if (!casamento.value) return
  const estavaArquivado = arquivado.value
  arquivando.value = true
  try {
    await updateWedding(id.value, { statusCicloVida: estavaArquivado ? 'rascunho' : 'arquivado' })
    toast.success(
      estavaArquivado
        ? 'Casamento desarquivado como rascunho — quem publica o site é o casal.'
        : 'Casamento arquivado.',
    )
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível alterar o status.'))
  } finally {
    arquivando.value = false
  }
}

// --- acessos --------------------------------------------------------------
const novoMembro = reactive({ email: '', papel: 'colaborador' as PapelDeMembro })
const vinculando = ref(false)

const opcoesDePapel = PAPEIS_DE_MEMBRO.map((papel) => ({
  value: papel,
  label: rotuloDoPapel(papel),
}))

async function vincular() {
  vinculando.value = true
  try {
    await addMember(id.value, { email: novoMembro.email, papel: novoMembro.papel })
    toast.success('Acesso vinculado — a pessoa recebeu um e-mail.')
    novoMembro.email = ''
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível vincular este acesso.'))
  } finally {
    vinculando.value = false
  }
}

async function desvincular(memberId: string) {
  try {
    await removeMember(id.value, memberId)
    toast.success('Acesso removido.')
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível remover este acesso.'))
  }
}

// --- acesso de suporte ----------------------------------------------------
//
// O operador entra no painel do casal como membro de verdade, temporário
// (docs/fase5-multievento.md 6.7). Não há contexto especial nem policy
// cross-tenant: é o mesmo caminho de todo mundo, e é isso que o torna
// confiável.
const abrindoSuporte = ref(false)

const suporteAtivo = computed(() => {
  const ate = casamento.value?.acessoDeSuporteAte
  return Boolean(ate && new Date(ate) > new Date())
})

const suporteExpiraLabel = computed(() => {
  const ate = casamento.value?.acessoDeSuporteAte
  if (!ate) return ''
  return new Date(ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
})

async function entrarNoPainel() {
  abrindoSuporte.value = true
  try {
    const { data: acesso } = await abrirAcessoDeSuporte(id.value)
    await navigateTo(`/admin/${acesso.slug}`)
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível abrir o acesso.'))
    abrindoSuporte.value = false
  }
}

async function encerrarSuporte() {
  try {
    await encerrarAcessoDeSuporte(id.value)
    toast.success('Acesso de suporte encerrado.')
    // A lista de casamentos da sessão acabou de encolher no servidor. O
    // middleware só reconfere quando NÃO encontra o slug, então um cache que
    // ainda afirma o vínculo não se corrige sozinho — e deixaria o casamento
    // na troca de evento levando a um painel que já não abre nada.
    await useAuthStore().fetchSession()
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível encerrar o acesso.'))
  }
}

/** O rótulo do botão principal do topo, que muda com o vínculo que já existe. */
const rotuloDeEntrada = computed(() => {
  if (casamento.value?.membroDeVerdade || suporteAtivo.value) return 'Abrir painel'
  return 'Entrar para dar suporte'
})

// --- exclusão -------------------------------------------------------------
const excluindoModal = ref(false)
const confirmacao = ref('')
const excluindo = ref(false)

// Digitar o endereço é a trava: um clique a mais em "tem certeza?" vira
// reflexo, e esta ação não tem desfazer.
const podeExcluir = computed(() => confirmacao.value.trim() === casamento.value?.slug)

async function excluir() {
  excluindo.value = true
  try {
    await deleteWedding(id.value)
    toast.success('Casamento excluído.')
    await router.push('/plataforma')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível excluir este casamento.'))
    excluindo.value = false
  }
}

/**
 * Os três atores da trilha (CLAUDE.md, seção 11), cada um com um ícone: numa
 * lista onde toda linha começa com um verbo, a origem da ação é o que separa
 * "o casal fez" de "a plataforma fez" — e é justamente isso que a equipe vem
 * conferir aqui.
 */
const AUTOR: Record<string, { rotulo: string; icone: string }> = {
  membro: { rotulo: 'Painel do casal', icone: 'lucide:user' },
  sistema: { rotulo: 'Sistema', icone: 'lucide:bot' },
  operador: { rotulo: 'Plataforma', icone: 'lucide:life-buoy' },
}

const AUTOR_DESCONHECIDO = { rotulo: 'Desconhecido', icone: 'lucide:circle-help' }

function autorDaLinha(tipoAutor: string) {
  return AUTOR[tipoAutor] ?? AUTOR_DESCONHECIDO
}

/** Data e HORA: numa trilha, duas ações do mesmo dia precisam de ordem. */
function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <AdminSection :title="casamento?.nomesNoivos ?? 'Casamento'" :meta="meta">
    <template #actions>
      <UiButton variant="ghost" to="/plataforma">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Casamentos
      </UiButton>
      <UiButton v-if="casamento" :disabled="abrindoSuporte" @click="entrarNoPainel">
        {{ rotuloDeEntrada }}
      </UiButton>
    </template>

    <div v-if="status === 'pending'" class="flex flex-col gap-4">
      <UiSkeleton class="h-24 w-full" />
      <UiSkeleton v-for="n in 3" :key="n" class="h-40 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error || !casamento"
      icon="lucide:file-question"
      title="Não foi possível carregar este casamento"
      description="Ele pode ter sido excluído, ou a conexão falhou."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else>
      <AdminMetricStrip :metrics="metricas" />

      <!-- Acesso de suporte: o assunto que muda de estado enquanto a tela está
           aberta, por isso o estado vem antes da ação. -->
      <AdminPanel title="Painel do casal">
        <template #headerActions>
          <UiBadge v-if="casamento.membroDeVerdade" tone="primary">Você é membro</UiBadge>
          <UiBadge v-else-if="suporteAtivo" tone="warning">
            Suporte aberto até {{ suporteExpiraLabel }}
          </UiBadge>
        </template>

        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p class="max-w-prose text-sm text-text-muted">
            <template v-if="casamento.membroDeVerdade">
              Você é membro deste casamento — entra pelo painel normalmente, sem acesso temporário.
            </template>
            <template v-else-if="suporteAtivo">
              O acesso expira sozinho, mas encerre quando o atendimento terminar. Conceder e
              encerrar ficam registrados na trilha deste casamento.
            </template>
            <template v-else>
              Abre um acesso temporário de {{ HORAS_DE_ACESSO_DE_SUPORTE }} horas ao painel deste
              casal, como membro de verdade. Fica registrado na trilha deste casamento.
            </template>
          </p>

          <!-- Só o que existe deste lado: abrir/entrar é a ação principal do
               registro e vive no topo da ficha, e repeti-la aqui daria dois
               botões idênticos a dois palmos um do outro. Encerrar não tem
               esse problema — só existe enquanto o acesso está aberto. -->
          <UiButton v-if="suporteAtivo" variant="ghost" class="shrink-0" @click="encerrarSuporte">
            Encerrar acesso
          </UiButton>
        </div>
      </AdminPanel>

      <!-- Dados do evento -->
      <AdminPanel title="Dados do evento">
        <template #headerActions>
          <UiBadge :tone="weddingLifecyclePresentation(casamento.statusCicloVida).tone">
            {{ weddingLifecyclePresentation(casamento.statusCicloVida).label }}
          </UiBadge>
          <UiButton v-if="!editando" size="sm" variant="ghost" @click="abrirEdicao">
            <Icon name="lucide:pencil" class="h-4 w-4" />
            Editar
          </UiButton>
        </template>

        <div v-if="editando" class="flex flex-col gap-4 px-4 py-4 sm:px-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <UiInput v-model="form.nomesNoivos" label="Nome do casal" />
            <UiDatePicker v-model="form.dataEvento" label="Data do evento" />
          </div>
          <UiInput
            v-model="form.slug"
            label="Endereço do site"
            hint="É o que vai depois do domínio."
          />

          <p
            v-if="avisoDoSlug"
            class="flex items-start gap-2 rounded-md px-3 py-2 text-xs leading-relaxed"
            :class="
              slugQuebraAlgo ? 'bg-danger/10 text-danger' : 'bg-surface-muted text-text-muted'
            "
          >
            <Icon
              :name="slugQuebraAlgo ? 'lucide:triangle-alert' : 'lucide:info'"
              class="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span><strong class="font-medium">Trocar o endereço:</strong> {{ avisoDoSlug }}</span>
          </p>

          <div class="flex gap-2">
            <UiButton :disabled="salvando" @click="salvar">Salvar</UiButton>
            <UiButton variant="ghost" :disabled="salvando" @click="editando = false">
              Cancelar
            </UiButton>
          </div>
        </div>

        <dl v-else class="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-surface-elevated px-4 py-3 sm:px-5">
            <dt class="text-xs font-medium tracking-wide text-text-muted uppercase">Casal</dt>
            <dd class="mt-0.5 text-sm text-text">{{ casamento.nomesNoivos }}</dd>
          </div>
          <div class="bg-surface-elevated px-4 py-3 sm:px-5">
            <dt class="text-xs font-medium tracking-wide text-text-muted uppercase">Data</dt>
            <dd class="mt-0.5 text-sm text-text">{{ formatDatePtBR(casamento.dataEvento) }}</dd>
          </div>
          <div class="bg-surface-elevated px-4 py-3 sm:px-5">
            <dt class="text-xs font-medium tracking-wide text-text-muted uppercase">Endereço</dt>
            <dd class="mt-0.5 text-sm text-text">/{{ casamento.slug }}</dd>
          </div>
          <!-- Saiu da listagem para caber o menu de ações, e a ficha é onde ele
               importa: quando este evento entrou na plataforma. -->
          <div class="bg-surface-elevated px-4 py-3 sm:px-5">
            <dt class="text-xs font-medium tracking-wide text-text-muted uppercase">Criado em</dt>
            <dd class="mt-0.5 text-sm text-text">{{ formatDatePtBR(casamento.createdAt) }}</dd>
          </div>
        </dl>
      </AdminPanel>

      <!-- Acessos -->
      <AdminPanel
        title="Quem tem acesso"
        :meta="`${casamento.membros.length} ${casamento.membros.length === 1 ? 'pessoa' : 'pessoas'}`"
      >
        <ul class="flex flex-col divide-y divide-border">
          <li
            v-for="membro in casamento.membros"
            :key="membro.id"
            class="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
          >
            <div class="min-w-0">
              <p class="truncate text-sm text-text">{{ membro.email }}</p>
              <p class="mt-0.5 text-xs text-text-muted">desde {{ formatDatePtBR(membro.desde) }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UiBadge :tone="membro.papel === 'dono' ? 'primary' : 'neutral'">
                {{ rotuloDoPapel(membro.papel) }}
              </UiBadge>
              <!-- Ícone, não um botão vermelho por linha: o compromisso com a
                   segurança fica em quem recusa a remoção do último dono, não
                   num botão que rouba a hierarquia do e-mail ao lado. -->
              <AdminRowAction
                icon="lucide:user-minus"
                label="Remover acesso"
                tone="danger"
                @click="desvincular(membro.id)"
              />
            </div>
          </li>
        </ul>

        <div
          class="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-end sm:px-5"
        >
          <UiInput
            v-model="novoMembro.email"
            type="email"
            label="Vincular acesso"
            placeholder="pessoa@exemplo.com"
            autocomplete="off"
            class="flex-1"
          />
          <UiSelect v-model="novoMembro.papel" label="Papel" :options="opcoesDePapel" />
          <UiButton :disabled="vinculando || !novoMembro.email" class="shrink-0" @click="vincular">
            Vincular
          </UiButton>
        </div>

        <p class="border-t border-border px-4 py-3 text-xs leading-relaxed text-text-muted sm:px-5">
          Vincular aqui dá acesso ao painel deste casamento. O último dono nunca pode ser removido —
          vincule o novo antes de tirar o antigo.
        </p>
      </AdminPanel>

      <!-- Trilha -->
      <AdminPanel title="O que aconteceu neste casamento">
        <p v-if="!casamento.trilha.length" class="px-4 py-4 text-sm text-text-muted sm:px-5">
          Nenhuma ação registrada ainda.
        </p>
        <ul v-else class="flex flex-col divide-y divide-border">
          <li
            v-for="linha in casamento.trilha"
            :key="linha.id"
            class="flex items-center gap-3 px-4 py-2.5 sm:px-5"
          >
            <Icon
              :name="autorDaLinha(linha.tipoAutor).icone"
              class="h-4 w-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate text-sm text-text">{{ linha.acao }}</span>
            <span class="shrink-0 text-xs text-text-muted">
              {{ autorDaLinha(linha.tipoAutor).rotulo }}
            </span>
            <span class="num shrink-0 text-xs text-text-muted">{{ quando(linha.createdAt) }}</span>
          </li>
        </ul>
      </AdminPanel>

      <!-- Escopo e exclusão -->
      <AdminPanel title="Escopo">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p class="max-w-prose text-sm text-text-muted">
            <template v-if="arquivado">
              Arquivado. Desarquivar devolve para <strong class="text-text">rascunho</strong> — pôr
              o site no ar de novo é decisão do casal.
            </template>
            <template v-else>Arquivar tira o evento da operação. Não exclui nada.</template>
          </p>
          <UiButton variant="ghost" :disabled="arquivando" @click="alternarArquivamento">
            {{ arquivado ? 'Desarquivar' : 'Arquivar' }}
          </UiButton>
        </div>

        <!-- A faixa de perigo se anuncia como tal: mesmo tom de fundo dos
             avisos de risco do resto do painel, para que "Excluir" não divida
             a mesma superfície neutra de "Arquivar", que é reversível. -->
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-danger/20 bg-danger/5 px-4 py-4 sm:px-5"
        >
          <p class="max-w-prose text-sm text-text-muted">
            Excluir apaga <strong class="text-text">tudo</strong>: convidados, convites, respostas,
            presentes, pagamentos, mesas e documentos. Não há desfazer.
          </p>
          <UiButton variant="destructive" class="shrink-0" @click="excluindoModal = true">
            Excluir casamento
          </UiButton>
        </div>
      </AdminPanel>

      <UiModal v-model="excluindoModal" title="Excluir casamento">
        <div class="flex flex-col gap-3 text-sm">
          <p class="text-text">
            Isto apaga <strong>{{ casamento.nomesNoivos }}</strong> e tudo que existe dentro dele —
            {{ casamento.contagemConvidados }} convidado(s),
            {{ casamento.convitesEnviados }} convite(s) enviado(s) e
            {{ formatarBytes(casamento.storageBytes) }} em arquivos. Não há desfazer.
          </p>
          <p class="text-text-muted">
            Fica registrado quem excluiu, quando e o que era — mas o conteúdo não volta.
          </p>
          <UiInput
            v-model="confirmacao"
            :label="`Digite ${casamento.slug} para confirmar`"
            :placeholder="casamento.slug"
          />
        </div>

        <template #footer>
          <UiButton variant="ghost" :disabled="excluindo" @click="excluindoModal = false">
            Cancelar
          </UiButton>
          <UiButton variant="destructive" :disabled="!podeExcluir || excluindo" @click="excluir">
            Excluir para sempre
          </UiButton>
        </template>
      </UiModal>
    </template>
  </AdminSection>
</template>
