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

async function alternarArquivamento() {
  if (!casamento.value) return
  const arquivado = casamento.value.statusCicloVida === 'arquivado'
  arquivando.value = true
  try {
    await updateWedding(id.value, { statusCicloVida: arquivado ? 'rascunho' : 'arquivado' })
    toast.success(
      arquivado
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
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível encerrar o acesso.'))
  }
}

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

const ROTULO_DO_AUTOR: Record<string, string> = {
  membro: 'Painel do casal',
  sistema: 'Sistema',
  operador: 'Plataforma',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NuxtLink
      to="/plataforma"
      class="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted transition-brand hover:text-text"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Casamentos
    </NuxtLink>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 4" :key="n" class="h-20 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error || !casamento"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar este casamento"
      description="Ele pode ter sido excluído, ou a conexão falhou."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold text-text">{{ casamento.nomesNoivos }}</h1>
          <p class="mt-1 text-sm text-text-muted">
            /{{ casamento.slug }} · {{ formatDatePtBR(casamento.dataEvento) }}
          </p>
        </div>
        <UiBadge :tone="weddingLifecyclePresentation(casamento.statusCicloVida).tone">
          {{ weddingLifecyclePresentation(casamento.statusCicloVida).label }}
        </UiBadge>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <UiCard>
          <p class="text-xs text-text-muted">Convidados</p>
          <p class="num mt-1 text-lg font-semibold text-text">{{ casamento.contagemConvidados }}</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-text-muted">Storage</p>
          <p class="num mt-1 text-lg font-semibold text-text">
            {{ formatarBytes(casamento.storageBytes) }}
          </p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-text-muted">Convites enviados</p>
          <p class="num mt-1 text-lg font-semibold text-text">{{ casamento.convitesEnviados }}</p>
        </UiCard>
      </div>

      <!-- Acesso de suporte -->
      <UiCard class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-text">Painel do casal</h2>
            <p class="mt-0.5 text-xs text-text-muted">
              <template v-if="casamento.membroDeVerdade">
                Você é membro deste casamento — entra pelo painel normalmente.
              </template>
              <template v-else-if="suporteAtivo">
                Acesso de suporte aberto até {{ suporteExpiraLabel }}. Ele expira sozinho, mas
                encerre quando o atendimento terminar.
              </template>
              <template v-else>
                Abre um acesso temporário de {{ HORAS_DE_ACESSO_DE_SUPORTE }} horas para dar
                suporte. Fica registrado na trilha deste casamento.
              </template>
            </p>
          </div>

          <div class="flex shrink-0 gap-2">
            <UiButton v-if="suporteAtivo" variant="ghost" @click="encerrarSuporte">
              Encerrar acesso
            </UiButton>
            <UiButton :disabled="abrindoSuporte" @click="entrarNoPainel">
              {{
                suporteAtivo || casamento.membroDeVerdade
                  ? 'Abrir painel'
                  : 'Entrar para dar suporte'
              }}
            </UiButton>
          </div>
        </div>
      </UiCard>

      <!-- Dados do evento -->
      <UiCard class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-text">Dados do evento</h2>
          <UiButton v-if="!editando" size="sm" variant="ghost" @click="abrirEdicao"
            >Editar</UiButton
          >
        </div>

        <template v-if="editando">
          <UiInput v-model="form.nomesNoivos" label="Nome do casal" />
          <UiDatePicker v-model="form.dataEvento" label="Data do evento" />
          <UiInput
            v-model="form.slug"
            label="Endereço do site"
            hint="É o que vai depois do domínio."
          />

          <p
            v-if="avisoDoSlug"
            class="rounded-md px-3 py-2 text-xs"
            :class="
              casamento.convitesEnviados || casamento.credenciaisAtivas
                ? 'bg-danger/10 text-danger'
                : 'bg-surface-muted text-text-muted'
            "
          >
            <strong class="font-medium">Trocar o endereço:</strong> {{ avisoDoSlug }}
          </p>

          <div class="flex gap-2">
            <UiButton :disabled="salvando" @click="salvar">Salvar</UiButton>
            <UiButton variant="ghost" :disabled="salvando" @click="editando = false">
              Cancelar
            </UiButton>
          </div>
        </template>

        <dl v-else class="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs text-text-muted">Casal</dt>
            <dd class="text-text">{{ casamento.nomesNoivos }}</dd>
          </div>
          <div>
            <dt class="text-xs text-text-muted">Data</dt>
            <dd class="text-text">{{ formatDatePtBR(casamento.dataEvento) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-text-muted">Endereço</dt>
            <dd class="text-text">/{{ casamento.slug }}</dd>
          </div>
        </dl>
      </UiCard>

      <!-- Acessos -->
      <UiCard class="flex flex-col gap-4">
        <div>
          <h2 class="text-sm font-semibold text-text">Quem tem acesso</h2>
          <p class="mt-0.5 text-xs text-text-muted">
            Vincular aqui dá acesso ao painel deste casamento. O último dono nunca pode ser removido
            — vincule o novo antes de tirar o antigo.
          </p>
        </div>

        <ul class="divide-y divide-border overflow-hidden rounded-md border border-border">
          <li
            v-for="membro in casamento.membros"
            :key="membro.id"
            class="flex items-center justify-between gap-4 px-3 py-2.5"
          >
            <div class="min-w-0">
              <p class="truncate text-sm text-text">{{ membro.email }}</p>
              <UiBadge :tone="membro.papel === 'dono' ? 'primary' : 'neutral'" class="mt-1">
                {{ rotuloDoPapel(membro.papel) }}
              </UiBadge>
            </div>
            <UiButton
              size="sm"
              variant="destructive"
              class="shrink-0"
              @click="desvincular(membro.id)"
            >
              Remover
            </UiButton>
          </li>
        </ul>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <UiInput
            v-model="novoMembro.email"
            type="email"
            label="E-mail"
            placeholder="pessoa@exemplo.com"
            class="flex-1"
          />
          <UiSelect v-model="novoMembro.papel" label="Papel" :options="opcoesDePapel" />
          <UiButton :disabled="vinculando || !novoMembro.email" class="shrink-0" @click="vincular">
            Vincular
          </UiButton>
        </div>
      </UiCard>

      <!-- Trilha -->
      <UiCard class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-text">O que aconteceu neste casamento</h2>
        <p v-if="!casamento.trilha.length" class="text-sm text-text-muted">
          Nenhuma ação registrada ainda.
        </p>
        <ul v-else class="flex flex-col gap-1.5 text-sm">
          <li v-for="linha in casamento.trilha" :key="linha.id" class="flex flex-wrap gap-x-2">
            <span class="text-text">{{ linha.acao }}</span>
            <span class="text-text-muted">· {{ ROTULO_DO_AUTOR[linha.tipoAutor] }}</span>
            <span class="text-text-muted">· {{ formatDatePtBR(linha.createdAt) }}</span>
          </li>
        </ul>
      </UiCard>

      <!-- Ciclo de vida e exclusão -->
      <UiCard class="flex flex-col gap-4">
        <h2 class="text-sm font-semibold text-text">Escopo</h2>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-text-muted">
            <template v-if="casamento.statusCicloVida === 'arquivado'">
              Arquivado. Desarquivar devolve para <strong class="text-text">rascunho</strong> — pôr
              o site no ar de novo é decisão do casal.
            </template>
            <template v-else>Arquivar tira o evento da operação. Não exclui nada.</template>
          </p>
          <UiButton variant="ghost" :disabled="arquivando" @click="alternarArquivamento">
            {{ casamento.statusCicloVida === 'arquivado' ? 'Desarquivar' : 'Arquivar' }}
          </UiButton>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p class="text-sm text-text-muted">
            Excluir apaga <strong class="text-text">tudo</strong>: convidados, convites, respostas,
            presentes, pagamentos, mesas e documentos. Não há desfazer.
          </p>
          <UiButton variant="destructive" class="shrink-0" @click="excluindoModal = true">
            Excluir casamento
          </UiButton>
        </div>
      </UiCard>

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
  </div>
</template>
