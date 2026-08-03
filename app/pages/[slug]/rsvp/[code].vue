<script setup lang="ts">
// noindex: link individual do convite, nunca deve ser indexado (CLAUDE.md,
// seção 26). Atalho direto — pula busca e confirmação leve (CLAUDE.md,
// seção 12.1).
definePageMeta({ layout: 'default' })

const route = useRoute()
const code = route.params.code as string
const slug = useWeddingSlug()

const { getRsvpByCode } = useRsvp()
const { data, status, error } = await useAsyncData(`rsvp-code-${code}`, () => getRsvpByCode(code))

useSeoMeta({
  title: 'Confirmação de Presença',
  robots: 'noindex, nofollow',
})

function formatDeadline(value: string | null): string {
  if (!value) return 'o dia do evento'
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
    <div v-if="status === 'pending'" class="flex flex-col gap-3">
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
        <p class="text-sm uppercase tracking-widest text-text-muted">{{ data.wedding.coupleNames }}</p>
        <h1 class="mt-1 text-xl font-semibold text-text">Confirmação de Presença</h1>
        <p class="mt-2 text-sm text-text-muted">
          Confirme sua presença até {{ formatDeadline(data.wedding.rsvpDeadline) }}.
        </p>
      </div>

      <RsvpInviteFlow :payload="data" />

      <NuxtLink
        :to="`/${slug}/#presentes`"
        class="text-center text-sm text-primary underline-offset-2 hover:underline"
      >
        Ver lista de presentes
      </NuxtLink>
    </template>
  </div>
</template>
