<!--
  A linha de convite do cadastro — relata o vínculo e oferece UMA ação.

  Foi um passo do wizard, depois uma caixa marcável com dois campos (nome e
  observações internas do convite). Os campos saíram: são dados DO CONVITE, e
  editá-los aqui criava um segundo lugar para mexer no que a tela de Convites
  já administra — com o agravante de pedir "observações internas de um convite"
  a quem está cadastrando uma pessoa.

  E o que faltava era mais grave que os campos sobrando: com o convidado JÁ
  vinculado, o bloco desaparecia inteiro. O cadastro não dizia que existia
  vínculo, nem a quê, nem como chegar lá — apesar de `GET /api/guests/:id` já
  devolver `invite: { id, nome }`. O formulário sabia e não contava.

  Agora a linha existe sempre, em três estados:

  1. Vinculado    → nome do convite + caminho para a tela de Convites.
  2. Sem convite  → o motivo de precisar de um, e o botão que o pede.
  3. Pedido       → o que vai nascer, e como desfazer.

  O convite nasce na MESMA transação do convidado (`sincronizar_nucleo_convidado`),
  nunca no clique: assim cancelar o cadastro não deixa convite vazio para trás
  — ao contrário de "Criar novo grupo", ali em cima, que grava na hora.

  O nome é derivado ("Família Mateus") e renomear é assunto de Convites. É a
  divisão que o resto do desenho segue: aqui se resolve o VÍNCULO, lá o convite.

  `convites` continua sendo a unidade de RSVP, separada do núcleo de propósito
  (CLAUDE.md, seção 12) — daí a linha ter título próprio em vez de virar mais
  um campo da seção Acompanhantes.
-->
<script setup lang="ts">
export interface InviteDraft {
  criar: boolean
  /** Nome sugerido, derivado do primeiro nome pelo pai — nunca digitado aqui. */
  nome: string
}

interface Props {
  modelValue: InviteDraft
  /** Total de pessoas que vão no convite (este cadastro + acompanhantes). */
  partySize: number
  /** Convite já vinculado, quando existe — deixa a linha em modo leitura. */
  inviteVinculado?: { id: string; nome: string } | null
  weddingSlug: string
}

const { modelValue, partySize, inviteVinculado = null, weddingSlug } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: InviteDraft] }>()

/**
 * "estas 2 pessoas" / "esta pessoa": o convite é a unidade de RSVP, e vale
 * igual para quem está sozinho. Antes a linha só aparecia com acompanhantes,
 * então quem cadastrava uma pessoa só não via nada sobre convite — e ficava
 * sem poder responder, sem nada na tela dizendo por quê.
 */
const quemPrecisa = computed(() => (partySize > 1 ? `estas ${partySize} pessoas` : 'esta pessoa'))

const linkDoConvite = computed(() =>
  inviteVinculado ? `/admin/${weddingSlug}/convites?editar=${inviteVinculado.id}` : '',
)
</script>

<template>
  <section class="flex flex-col gap-2 rounded-md border border-border px-3 py-3">
    <h3 class="text-sm font-semibold text-text">Convite</h3>

    <!-- 1. Vinculado. -->
    <div v-if="inviteVinculado" class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Icon name="lucide:ticket" class="h-4 w-4 shrink-0 text-text-muted" />
      <span class="min-w-0 flex-1 truncate text-sm text-text">{{ inviteVinculado.nome }}</span>
      <NuxtLink
        :to="linkDoConvite"
        class="shrink-0 text-xs text-primary transition-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Abrir em Convites
      </NuxtLink>
    </div>

    <!-- 2. Sem convite: o motivo vem antes da ação, porque é o motivo que faz
         a ação valer a pena. Sem convite não existe RSVP. -->
    <div v-else-if="!modelValue.criar" class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p class="min-w-0 flex-1 text-sm text-text-muted">
        Sem um convite, {{ quemPrecisa }}
        {{ partySize > 1 ? 'não conseguem' : 'não consegue' }} responder ao RSVP.
      </p>
      <UiButton
        size="sm"
        variant="outline"
        class="shrink-0"
        @click="emit('update:modelValue', { ...modelValue, criar: true })"
      >
        <Icon name="lucide:ticket" class="h-4 w-4" />
        Criar convite
      </UiButton>
    </div>

    <!-- 3. Pedido, ainda não criado. Diz o nome que vai nascer, para não haver
         surpresa, e o desfazer fica ao lado — é a mesma decisão, nos dois
         sentidos. -->
    <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Icon name="lucide:ticket" class="h-4 w-4 shrink-0 text-text-muted" />
      <span class="min-w-0 flex-1 text-sm text-text-muted">
        Será criado ao salvar, com {{ quemPrecisa }} dentro:
        <span class="font-medium text-text">{{ modelValue.nome || 'Convite' }}</span>
      </span>
      <button
        type="button"
        class="shrink-0 text-xs text-text-muted transition-brand hover:text-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="emit('update:modelValue', { ...modelValue, criar: false })"
      >
        Não criar agora
      </button>
    </div>

    <p v-if="!inviteVinculado" class="text-xs text-text-muted">
      O nome e as observações do convite se editam na tela de Convites.
    </p>
  </section>
</template>
