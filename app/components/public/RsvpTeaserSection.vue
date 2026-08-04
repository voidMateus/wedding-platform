<script setup lang="ts">
// Seção de maior destaque da home (pedido do usuário — CLAUDE.md, seção 21):
// tone="accent" (mesma banda usada no Hero sem foto de capa) e CTA real para
// a busca por nome em /{slug}/rsvp (RsvpInviteFlow — busca tolerante →
// confirmação leve mascarada → convite completo), não apenas um cartão
// informativo estático.
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const rsvpLink = computed(() => `/${wedding.slug}/rsvp`)

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <PublicEditorialSection id="confirmar-presenca" eyebrow="R.S.V.P" title="Confirme sua Presença" tone="accent">
    <div
      class="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-xl border border-primary/15 bg-surface-elevated p-8 text-center shadow-xl sm:p-10"
    >
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="lucide:party-popper" class="h-7 w-7" />
      </span>
      <div>
        <p class="font-display text-2xl font-semibold text-heading">{{ wedding.couple_names }}</p>
        <p class="text-sm text-text-muted">{{ formattedDate }}</p>
      </div>
      <p class="leading-relaxed text-body">
        Digite seu nome para localizar seu convite e confirmar presença, restrições alimentares e
        acompanhantes.
      </p>
      <UiButton :to="rsvpLink" rounded="full" size="lg">
        <Icon name="lucide:check" class="h-5 w-5" />
        Confirmar presença
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
