<script setup lang="ts">
// noindex: página individual por convidado, nunca deve ser indexada
// (CLAUDE.md, seção 26).
definePageMeta({ layout: 'default' })

const route = useRoute()
const code = route.params.code as string

const { getRsvp } = useRsvp(code)
const { data, status, error, refresh } = getRsvp()

useSeoMeta({
  title: 'Confirmar presença',
  robots: 'noindex, nofollow',
})

function formatDeadline(value: string | null): string {
  if (!value) return 'o dia do evento'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
    <div v-if="status === 'pending' && !data" class="flex flex-col gap-3">
      <UiSkeleton class="h-8 w-48" />
      <UiSkeleton class="h-40 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error || !data"
      title="Link inválido"
      description="Esse link de confirmação não é válido ou já expirou. Fale com o casal para receber um novo link."
    />

    <template v-else>
      <div>
        <p class="text-sm uppercase tracking-widest text-text-muted">
          {{ data.wedding.coupleNames }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-text">Olá, {{ data.displayName }}!</h1>
        <p class="mt-2 text-sm text-text-muted">
          Confirme sua presença até {{ formatDeadline(data.wedding.rsvpDeadline) }}.
        </p>
      </div>

      <p
        v-if="data.isPastDeadline"
        class="rounded-md border border-border bg-surface-muted p-3 text-sm text-text-muted"
      >
        O prazo para confirmar presença já encerrou. Sua última resposta registrada continua
        abaixo, mas não é mais possível alterá-la.
      </p>

      <RsvpForm :code="code" :details="data" @submitted="refresh" />
    </template>
  </div>
</template>
