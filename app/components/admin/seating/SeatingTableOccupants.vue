<!--
  Quem senta numa mesa, e como sentar mais gente.

  **Sentar é atributo da pessoa, e se resolve abrindo a mesa e escolhendo** —
  arrastar pessoas para dentro de círculos na planta seria um segundo caminho
  para a mesma mutação, que só funciona no desktop e que precisaria conviver
  com este de qualquer jeito (CLAUDE.md: a planta nunca é o único caminho).

  Os dois atalhos existem porque é assim que uma mesa é montada de verdade:
  ninguém senta pessoa por pessoa, senta-se a família. "Sentar o convite
  inteiro" e "sentar os acompanhantes" são as duas unidades que o modelo já
  conhece.

  Componente self-contained, que chama a própria mutação (CLAUDE.md seção 9): o
  pai só precisa saber que algo mudou para recarregar.
-->
<script setup lang="ts">
import type { MesaComOcupantes, PessoaParaSentar } from '~/types/mesa'

interface Props {
  mesa: MesaComOcupantes
  /** Quem ainda não sentou — a fonte do seletor de "adicionar". */
  semMesa: PessoaParaSentar[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ changed: [] }>()

const { sentar } = useSeating()
const toast = useToast()

const busca = ref('')
const isBusy = ref(false)

const candidatos = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  const lista = termo
    ? props.semMesa.filter((pessoa) => pessoa.nomeCompleto.toLowerCase().includes(termo))
    : props.semMesa
  // Teto de 8 na lista: ela vive dentro de uma linha expandida, e despejar
  // duzentos nomes ali empurraria a próxima mesa para fora da tela. Quem tem
  // muita gente usa a busca, que é o caminho normal com lista grande.
  return lista.slice(0, 8)
})

async function aplicar(convidadoIds: string[], avulsoIds: string[], mesaId: string | null) {
  if (!convidadoIds.length && !avulsoIds.length) return
  isBusy.value = true
  try {
    await sentar({ mesaId, convidadoIds, avulsoIds })
    busca.value = ''
    emit('changed')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível mudar a mesa.'))
  } finally {
    isBusy.value = false
  }
}

function sentarPessoa(pessoa: PessoaParaSentar) {
  return aplicar(
    pessoa.tipo === 'convidado' ? [pessoa.id] : [],
    pessoa.tipo === 'avulso' ? [pessoa.id] : [],
    props.mesa.id,
  )
}

function tirar(pessoa: PessoaParaSentar) {
  return aplicar(
    pessoa.tipo === 'convidado' ? [pessoa.id] : [],
    pessoa.tipo === 'avulso' ? [pessoa.id] : [],
    null,
  )
}

/** Todo mundo do mesmo convite que ainda não sentou — a família junta. */
function sentarConviteDe(pessoa: PessoaParaSentar) {
  if (!pessoa.conviteId) return
  const doConvite = props.semMesa.filter((outra) => outra.conviteId === pessoa.conviteId)
  return aplicar(
    doConvite.filter((p) => p.tipo === 'convidado').map((p) => p.id),
    doConvite.filter((p) => p.tipo === 'avulso').map((p) => p.id),
    props.mesa.id,
  )
}

/** Quantos viriam junto se o casal sentasse o convite inteiro. */
function totalDoConvite(pessoa: PessoaParaSentar): number {
  if (!pessoa.conviteId) return 0
  return props.semMesa.filter((outra) => outra.conviteId === pessoa.conviteId).length
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Avisos, nunca bloqueios: excesso de lugar e gente que recusou são
         estados reais do planejamento, e o produto que recusa gravá-los obriga
         o casal a sair dele para pensar. -->
    <p v-if="mesa.resumo.excedente > 0" class="text-sm text-warning">
      {{ mesa.resumo.excedente }}
      {{ mesa.resumo.excedente === 1 ? 'pessoa a mais' : 'pessoas a mais' }} do que os
      {{ mesa.capacidade }} lugares.
    </p>
    <p v-if="mesa.resumo.naoVao > 0" class="text-sm text-text-muted">
      {{ mesa.resumo.naoVao }} {{ mesa.resumo.naoVao === 1 ? 'pessoa' : 'pessoas' }} desta mesa já
      disse que não vai — continua aqui até vocês tirarem.
    </p>

    <ul v-if="mesa.ocupantes.length" class="flex flex-col divide-y divide-border">
      <li
        v-for="pessoa in mesa.ocupantes"
        :key="pessoa.id"
        class="flex items-center gap-3 py-2 text-sm"
      >
        <span class="min-w-0 flex-1 truncate text-text">{{ pessoa.nomeCompleto }}</span>
        <span v-if="pessoa.conviteNome" class="hidden truncate text-xs text-text-muted sm:block">
          {{ pessoa.conviteNome }}
        </span>
        <UiBadge v-if="pessoa.statusRsvp === 'recusado'" tone="neutral">não vai</UiBadge>
        <UiBadge v-else-if="pessoa.tipo === 'avulso'" tone="neutral">acompanhante</UiBadge>
        <AdminRowAction
          icon="lucide:user-minus"
          :label="`Tirar ${pessoa.nomeCompleto} desta mesa`"
          :disabled="isBusy"
          @click="tirar(pessoa)"
        />
      </li>
    </ul>

    <p v-else class="text-sm text-text-muted">Ninguém sentado aqui ainda.</p>

    <div class="flex flex-col gap-2 border-t border-border pt-3">
      <UiInput
        v-model="busca"
        icon="lucide:search"
        :aria-label="`Buscar quem sentar na ${mesa.nome}`"
        placeholder="Buscar quem ainda não sentou..."
        class="w-full sm:w-72"
      />

      <p v-if="!semMesa.length" class="text-sm text-text-muted">
        Todo mundo já tem mesa.
      </p>
      <p v-else-if="!candidatos.length" class="text-sm text-text-muted">
        Ninguém sem mesa com esse nome.
      </p>

      <ul v-else class="flex flex-col gap-1">
        <li
          v-for="pessoa in candidatos"
          :key="pessoa.id"
          class="flex items-center gap-2 text-sm"
        >
          <UiButton size="sm" variant="ghost" :disabled="isBusy" @click="sentarPessoa(pessoa)">
            <Icon name="lucide:plus" class="h-4 w-4" />
            {{ pessoa.nomeCompleto }}
          </UiButton>
          <!-- Só quando há mais de um: "sentar o convite inteiro" de uma pessoa
               só é o mesmo clique com outro nome. -->
          <UiButton
            v-if="totalDoConvite(pessoa) > 1"
            size="sm"
            variant="ghost"
            :disabled="isBusy"
            @click="sentarConviteDe(pessoa)"
          >
            + {{ pessoa.conviteNome }} ({{ totalDoConvite(pessoa) }})
          </UiButton>
        </li>
      </ul>
    </div>
  </div>
</template>
