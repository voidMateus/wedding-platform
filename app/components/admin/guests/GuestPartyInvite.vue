<!--
  O convite dos acompanhantes — antes um passo com duas opções de rádio
  ("criar agora" / "fazer depois"), agora uma linha marcável.

  Um passo inteiro para uma pergunta de sim ou não obrigava a passar por ele
  mesmo quando a resposta era a padrão. Como caixa, a resposta padrão já está
  dada e o casal só interage se quiser mudá-la.

  `convites` é a unidade de RSVP e existe separada do núcleo de acompanhantes
  de propósito (CLAUDE.md, seção 12): é por isso que este bloco tem título
  próprio em vez de virar mais um campo da seção Acompanhantes.
-->
<script setup lang="ts">
export interface InviteDraft {
  criar: boolean
  nome: string
  observacoes: string
}

interface Props {
  modelValue: InviteDraft
  /** Total de pessoas do núcleo (este cadastro + acompanhantes), só pro texto descritivo. */
  partySize: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: InviteDraft] }>()

function update<K extends keyof InviteDraft>(key: K, value: InviteDraft[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const rotulo = computed(() => `Criar um convite para estas ${props.partySize} pessoas`)
</script>

<template>
  <section class="flex flex-col gap-3 rounded-md border border-border px-3 py-3">
    <UiCheckbox
      :model-value="modelValue.criar"
      :label="rotulo"
      @update:model-value="update('criar', $event)"
    />

    <div v-if="modelValue.criar" class="flex flex-col gap-3 pl-6">
      <UiInput
        :model-value="modelValue.nome"
        label="Nome do convite"
        hint="Como este convite aparece na sua tela de Convites. O convidado não vê este nome."
        @update:model-value="update('nome', $event)"
      />
      <UiTextarea
        :model-value="modelValue.observacoes"
        label="Observações internas"
        placeholder="Nunca exibidas ao convidado"
        @update:model-value="update('observacoes', $event)"
      />
    </div>
  </section>
</template>
