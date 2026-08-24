<script setup lang="ts">
// Landing pós-login do painel administrativo (docs/PLANO-SAAS.md, Passo 3).
// app/middleware/auth.global.ts já redireciona direto pro casamento único
// quando há exatamente uma membership — esta página só é de fato exibida
// com zero ou mais de uma, e cobre os dois casos.
definePageMeta({ layout: 'auth' })

const authStore = useAuthStore()

if (!authStore.user) {
  await authStore.fetchSession()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="authStore.loading" class="flex flex-col gap-3">
      <UiSkeleton v-for="n in 2" :key="n" class="h-16 w-full" />
    </div>

    <UiEmptyState
      v-else-if="authStore.memberships.length === 0"
      icon="lucide:heart-crack"
      title="Nenhum casamento vinculado"
      description="Sua conta ainda não está vinculada a nenhum casamento. Fale com quem administra o seu evento."
    />

    <template v-else>
      <div>
        <h1 class="text-lg font-semibold text-text">Selecione um casamento</h1>
        <p class="mt-1 text-sm text-text-muted">Sua conta administra mais de um casamento.</p>
      </div>

      <div class="flex flex-col gap-3">
        <NuxtLink
          v-for="membership in authStore.memberships"
          :key="membership.weddingId"
          :to="`/admin/${membership.slug}`"
        >
          <UiCard variant="interactive" class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-text">{{ membership.nomesNoivos }}</p>
              <p class="text-xs text-text-muted">
                {{ membership.role === 'dono' ? 'Dono' : 'Colaborador' }}
              </p>
            </div>
            <Icon name="lucide:chevron-right" class="h-5 w-5 shrink-0 text-text-muted" />
          </UiCard>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
