import type { WeddingMembership } from '~/types/auth'

/**
 * A membership do casamento ativo — id, papel e `memberId` — derivada, nunca
 * guardada (docs/fase5-multievento.md 5.2).
 *
 * Antes isto era `auth.store.ts → weddingContext`, um `ref` populado só por
 * `fetchSession()`, que o middleware chama apenas quando não há usuário. Ou
 * seja: nunca na troca de evento. Quem é dono de um casamento e colaborador
 * de outro seguia "dono" depois de trocar, e a tela de acessos decidia por
 * ele se mostrava o botão de convidar — o servidor recusava, então não era
 * furo de autorização, era uma tela prometendo o que o servidor nega.
 *
 * A sessão já traz tudo o que isso precisa: `memberships` tem `weddingId`,
 * `papel`, `memberId` e `slug` de cada casamento. O ativo é o que casa com o
 * slug da rota, e um `computed` não envelhece — mesma escolha que faixa
 * etária, estágio do convite e estado de pagamento já fazem.
 *
 * Nunca é fonte de autorização: isso é sempre o servidor, a partir do JWT
 * (CLAUDE.md, seção 4.2).
 */
export function useActiveMembership() {
  const route = useRoute()
  const authStore = useAuthStore()

  return computed<WeddingMembership | null>(() => {
    const slug = typeof route.params.slug === 'string' ? route.params.slug : ''

    if (slug) {
      return authStore.memberships.find((membership) => membership.slug === slug) ?? null
    }

    // Fora de `/admin/{slug}/**` não há casamento ativo — exceto no caso em
    // que ele é inequívoco, que é o do casal com um evento só.
    return authStore.memberships.length === 1 ? (authStore.memberships[0] ?? null) : null
  })
}
