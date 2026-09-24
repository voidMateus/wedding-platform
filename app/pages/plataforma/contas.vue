<script setup lang="ts">
import { concederOperadorSchema } from '#shared/schemas/operadores-plataforma'
import { formatDatePtBR } from '#shared/utils/format-date'
import { rotuloDoPapel, type PapelDeMembro } from '#shared/papeis-de-membro'
import { getApiErrorMessage } from '~/utils/api-error'
import type { AcessosDeUmaPessoa } from '~/composables/usePlatformAccounts'

definePageMeta({ layout: 'plataforma' })

const toast = useToast()
const { getOperators, grantOperator, revokeOperator, lookupAccess } = usePlatformAccounts()
const { data, status, error, refresh } = getOperators()

const operadores = computed(() => data.value?.data ?? [])

// --- conceder ---

const emailNovo = ref('')
const concedendo = ref(false)

async function conceder() {
  const validado = concederOperadorSchema.safeParse({ email: emailNovo.value })
  if (!validado.success) {
    toast.error(validado.error.issues[0]?.message ?? 'E-mail inválido.')
    return
  }

  concedendo.value = true
  try {
    const { data: resultado } = await grantOperator(validado.data)
    // A resposta honesta de "já era operador" não é sucesso nem erro: a
    // plataforma não mudou de estado, e dizer "concedido" faria a tela afirmar
    // um fato que não aconteceu.
    toast.success(
      resultado.concedido
        ? `${resultado.email} agora é operador.`
        : `${resultado.email} já era operador — nada mudou.`,
    )
    emailNovo.value = ''
    await refresh()
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível conceder o acesso.'))
  } finally {
    concedendo.value = false
  }
}

// --- revogar ---

const revogando = ref<string | null>(null)

async function revogar(operador: { usuarioId: string; email: string | null }) {
  revogando.value = operador.usuarioId
  try {
    await revokeOperator(operador.usuarioId)
    toast.success(`${operador.email ?? 'Operador'} não tem mais acesso interno.`)
    await refresh()
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível revogar o acesso.'))
  } finally {
    revogando.value = null
  }
}

// --- quem tem acesso a quê ---

const emailConsultado = ref('')
const consultando = ref(false)
const resultado = ref<AcessosDeUmaPessoa | null>(null)

async function consultar() {
  const alvo = emailConsultado.value.trim()
  if (!alvo) return

  consultando.value = true
  try {
    resultado.value = await lookupAccess(alvo)
  } catch (erro) {
    resultado.value = null
    toast.error(getApiErrorMessage(erro, 'Não foi possível consultar.'))
  } finally {
    consultando.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 lg:p-6">
    <div>
      <h1 class="font-display text-2xl font-semibold text-heading">Contas e acessos</h1>
      <p class="mt-1 text-sm text-text-muted">
        Quem é da equipe interna, e o que cada pessoa alcança.
      </p>
    </div>

    <!-- ================= Operadores ================= -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold text-heading">Equipe interna</h2>
        <p class="mt-1 text-sm text-text-muted">
          Operador enxerga todos os casamentos. Para entrar no painel de um casal, o caminho
          continua sendo o acesso de suporte, que expira e aparece na trilha dele.
        </p>
      </div>

      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="conceder">
        <UiInput
          v-model="emailNovo"
          class="flex-1"
          label="E-mail"
          type="email"
          placeholder="colega@exemplo.com"
          hint="Quem ainda não tem conta recebe um convite."
        />
        <UiButton type="submit" :disabled="concedendo || !emailNovo.trim()">
          <Icon name="lucide:user-plus" class="h-4 w-4" />
          Conceder acesso
        </UiButton>
      </form>

      <UiSkeleton v-if="status === 'pending'" class="h-32 w-full" />

      <UiEmptyState
        v-else-if="error"
        title="Não foi possível carregar"
        :description="getApiErrorMessage(error, 'Tente de novo em instantes.')"
      />

      <div v-else class="flex flex-col divide-y divide-border rounded-lg border border-border">
        <div
          v-for="operador in operadores"
          :key="operador.usuarioId"
          class="flex flex-wrap items-center justify-between gap-3 p-4"
        >
          <div class="min-w-0">
            <p class="flex items-center gap-2 truncate text-sm font-medium text-text">
              {{ operador.email ?? operador.usuarioId }}
              <UiBadge v-if="operador.souEu" tone="neutral">você</UiBadge>
            </p>
            <p class="mt-0.5 text-xs text-text-muted">Desde {{ formatDatePtBR(operador.desde) }}</p>
          </div>

          <!-- Ninguém altera o próprio acesso (decisão 4.7). O botão não
               aparece em vez de aparecer e recusar: um controle que só diz não
               depois de apertado ensina menos que um que não existe. -->
          <UiButton
            v-if="!operador.souEu"
            size="sm"
            variant="ghost"
            :disabled="revogando === operador.usuarioId"
            @click="revogar(operador)"
          >
            Revogar
          </UiButton>
          <span v-else class="text-xs text-text-muted">Você não altera o próprio acesso</span>
        </div>
      </div>
    </section>

    <!-- ================= Quem tem acesso a quê ================= -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg font-semibold text-heading">Quem tem acesso a quê</h2>
        <p class="mt-1 text-sm text-text-muted">
          Consulta. Alterar o acesso de alguém continua sendo operação de dentro do casamento — é o
          que mantém a trilha do casal completa.
        </p>
      </div>

      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="consultar">
        <UiInput
          v-model="emailConsultado"
          class="flex-1"
          label="E-mail da pessoa"
          type="email"
          placeholder="pessoa@exemplo.com"
        />
        <UiButton
          type="submit"
          variant="outline"
          :disabled="consultando || !emailConsultado.trim()"
        >
          <Icon name="lucide:search" class="h-4 w-4" />
          Consultar
        </UiButton>
      </form>

      <template v-if="resultado">
        <UiEmptyState
          v-if="!resultado.encontrado"
          title="Nenhuma conta com esse e-mail"
          description="Ninguém com este endereço tem conta na plataforma."
        />

        <template v-else>
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-text">Acessos efetivos</p>
            <p v-if="!resultado.acessos.length" class="text-sm text-text-muted">
              Esta conta não é membro de nenhum casamento.
            </p>
            <div
              v-for="acesso in resultado.acessos"
              :key="acesso.casamentoId"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <span class="text-text">{{ acesso.nomesNoivos }}</span>
              <span class="flex items-center gap-3">
                <!-- "Assessoria", nunca "planejador": é o rótulo que o casal
                     lê no painel dele, e a tela interna descrevendo o mesmo
                     vínculo com outra palavra faria as duas discordarem. -->
                <UiBadge :tone="acesso.papel === 'dono' ? 'primary' : 'neutral'">
                  {{ rotuloDoPapel(acesso.papel as PapelDeMembro) }}
                </UiBadge>
                <NuxtLink
                  :to="`/plataforma/${acesso.casamentoId}`"
                  class="text-text-muted underline-offset-4 hover:text-text hover:underline"
                >
                  Abrir ficha
                </NuxtLink>
              </span>
            </div>
          </div>

          <!-- Separado dos acessos de verdade, e não fundido com eles: suporte
               é vínculo temporário da equipe, não membership (invariante 6).
               O vencido não aparece em lugar nenhum — `is_membro_casamento` já
               o ignora na leitura, e mostrá-lo seria a tela contradizer o
               banco. -->
          <div v-if="resultado.suportes.length" class="flex flex-col gap-2">
            <p class="text-sm font-medium text-text">Acesso de suporte (temporário)</p>
            <div
              v-for="suporte in resultado.suportes"
              :key="suporte.casamentoId"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm"
            >
              <span class="text-text">{{ suporte.nomesNoivos }}</span>
              <span class="text-text-muted">
                Expira em {{ formatDatePtBR(suporte.expiraEm) }}
              </span>
            </div>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>
