<script setup lang="ts">
// Cartão informativo (redesign de referência — CLAUDE.md, "Fase Vermelho
// Clássico"). O site de referência tem um formulário de RSVP por telefone
// direto na home; o nosso modelo de segurança exige o link único por
// convidado (CLAUDE.md, seção 4.5/14) — sem busca pública aberta, então
// esta seção continua só informativa, sem formulário funcional.
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <PublicEditorialSection id="confirmar-presenca" title="Confirme sua Presença" tone="muted">
    <div
      class="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-lg border border-border bg-surface-elevated p-6 text-center shadow-md"
    >
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="lucide:party-popper" class="h-6 w-6" />
      </span>
      <div>
        <p class="font-display text-xl font-semibold text-heading">{{ wedding.couple_names }}</p>
        <p class="text-sm text-text-muted">{{ formattedDate }}</p>
      </div>
      <p class="leading-relaxed text-body">
        Cada convidado recebe um link pessoal de confirmação, enviado por e-mail ou WhatsApp. Use
        esse link para confirmar presença, informar restrições alimentares e acompanhantes.
      </p>
      <p class="text-sm text-text-muted">Não encontrou o seu link? Entre em contato com a gente.</p>
    </div>
  </PublicEditorialSection>
</template>
