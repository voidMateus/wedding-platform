<!--
  A resposta de UMA pessoa: uma ESCOLHA entre duas, não dois CTAs.

  Até 23/09/2026 isto eram dois `UiButton`. No site público o botão assume
  `rounded="full"`, que força `!text-xs uppercase tracking-[0.16em]` — a
  identidade de CTA de convite de luxo. Ela está certa para "Enviar resposta",
  que é uma ação decisiva, e errada aqui: no celular as duas pílulas ocupavam a
  largura inteira com um rótulo de 12px dentro, e o conjunto lia como faixa
  decorativa em vez de controle. Pior, o único sinal de "já respondi" era
  preenchido vs. contornado — cor, exatamente o que o ponto 25 mandava não
  exigir. A tela compensava com uma linha "Resposta: Estará lá" embaixo, que era
  a muleta do controle errado e não um requisito.

  Por isso um `RadioGroup` do Reka e não dois botões: o grupo entrega
  `role="radio"` com `aria-checked` (estado real, não interpretação de cor), a
  navegação por setas entre as duas opções, e a semântica honesta de "uma
  escolha, dois valores" — duas ações independentes é o que o par de botões
  dizia, e não é verdade.

  O estado nunca depende só de cor: a opção escolhida muda **forma** (o disco
  vazio vira disco preenchido com o ícone), peso do rótulo e fundo. Quem não
  distingue as cores lê o disco.

  Fica em `components/rsvp/` e não em `components/ui/`: o `UiRadioGroup` pinta
  qualquer opção selecionada na cor primária, e aqui "Não poderei ir" em cor de
  festa seria uma mentira visual — as duas respostas precisam de tons
  diferentes. Generalizar isso no componente compartilhado antes de existir um
  segundo caso é a abstração especulativa que o CLAUDE.md (seção 5) proíbe.
-->
<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

type Resposta = 'confirmado' | 'recusado'

interface Props {
  /** 'pendente' deixa o grupo sem nenhuma opção marcada — o estado inicial real. */
  modelValue: 'pendente' | Resposta
  /**
   * Nome da pessoa. Entra no rótulo acessível de cada opção DEPOIS do texto
   * visível (WCAG 2.5.3): num convite de seis pessoas há doze alvos, e
   * "Estarei lá!" repetido não diz de quem. O nome logo acima resolve isso só
   * para quem enxerga.
   */
  personName: string
  disabled?: boolean
}

const { modelValue, personName, disabled = false } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [Resposta] }>()

const OPCOES = [
  { value: 'confirmado', label: 'Estarei lá!', icon: 'lucide:check' },
  { value: 'recusado', label: 'Não poderei ir', icon: 'lucide:x' },
] as const

/**
 * Tons diferentes por resposta, de propósito. "Estarei lá!" usa a cor do
 * casamento — é a resposta que a festa celebra. "Não poderei ir" usa o tom de
 * texto: marcado sem ambiguidade, sem pintar uma ausência de vermelho de erro.
 * Recusar não é falha, e cor de estado (danger) diria que é.
 */
const SELECIONADO: Record<Resposta, string> = {
  confirmado: 'border-primary bg-primary text-primary-foreground',
  recusado: 'border-text bg-text text-surface',
}
const DISCO_SELECIONADO: Record<Resposta, string> = {
  confirmado: 'border-primary-foreground/40 bg-primary-foreground/20',
  recusado: 'border-surface/40 bg-surface/20',
}
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue === 'pendente' ? undefined : modelValue"
    :disabled="disabled"
    :aria-label="`Resposta de ${personName}`"
    class="grid grid-cols-2 gap-2"
    @update:model-value="(value) => emit('update:modelValue', String(value) as Resposta)"
  >
    <RadioGroupItem
      v-for="opcao in OPCOES"
      :key="opcao.value"
      :value="opcao.value"
      :aria-label="`${opcao.label} — ${personName}`"
      :class="[
        'flex min-h-14 items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm transition-brand',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        modelValue === opcao.value
          ? `${SELECIONADO[opcao.value]} font-semibold`
          : 'border-border bg-surface-elevated font-medium text-text',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        modelValue !== opcao.value && !disabled ? 'hover:border-primary/40' : '',
      ]"
    >
      <!-- O disco é o que torna o estado legível sem cor: vazio quando a opção
           não está escolhida, preenchido com o ícone quando está. -->
      <span
        :class="[
          'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-brand',
          modelValue === opcao.value
            ? DISCO_SELECIONADO[opcao.value]
            : 'border-border text-text-muted',
        ]"
        aria-hidden="true"
      >
        <Icon :name="opcao.icon" class="h-3 w-3" />
      </span>
      <!--
        O rótulo QUEBRA, nunca trunca.

        Medido: "Não poderei ir" ocupa 95px em Inter 14px, e numa tela de 360px
        (Galaxy da linha A, das mais comuns no Brasil) sobram 88px por opção
        depois do disco, do respiro e da calha do grid — truncar entregaria
        "Não poderei i…", que é pior que duas linhas. A 390px cabe numa linha
        só. `min-h-14` é piso, não altura fixa, então a segunda linha cresce o
        controle em vez de vazar dele.
      -->
      <span class="min-w-0 text-center leading-tight">{{ opcao.label }}</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
