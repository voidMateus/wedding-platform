<script setup lang="ts">
// Cartão informativo (redesign de referência — CLAUDE.md, "Fase Vermelho
// Clássico") com CTA para a busca real por nome (`/{slug}/rsvp`, PR #55 —
// busca tolerante → confirmação leve mascarada → convite completo). O link
// direto por token (`/{slug}/rsvp/[code]`) continua funcionando como atalho
// para quem já recebeu, mas deixou de ser a única porta de entrada.
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

const rsvpSearchLink = computed(() => `/${wedding.slug}/rsvp`)
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
        Digite seu nome para localizar seu convite e confirmar presença, restrições alimentares e
        acompanhantes. Se você já recebeu um link pessoal por e-mail ou WhatsApp, pode usá-lo
        diretamente também.
      </p>
      <UiButton :to="rsvpSearchLink" rounded="full">
        <Icon name="lucide:search" class="h-4 w-4" />
        Buscar meu convite
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
