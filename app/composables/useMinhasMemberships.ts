import type { WeddingMembership } from '~/types/auth'

/**
 * Separa "os casamentos que são MEUS" de "os que eu só estou acessando para dar
 * suporte" (docs/fase5-multievento.md 6.7).
 *
 * Os dois vivem na mesma lista de propósito: para **entrar** em
 * `/admin/{slug}`, um vínculo de suporte vale exatamente como uma membership
 * de verdade — é o que faz o suporte funcionar sem policy especial nem
 * contexto sintético.
 *
 * Mas para toda pergunta sobre POSSE eles são coisas diferentes, e tratá-los
 * como iguais foi um defeito real: o operador da plataforma passou a cair em
 * "Seus casamentos" ao fazer login, com quatro eventos de clientes listados
 * como se fossem dele. Quem não tem casamento nenhum continua não tendo,
 * mesmo com quatro acessos abertos.
 */
export function useMinhasMemberships() {
  const authStore = useAuthStore()

  /** Só os de verdade — é o que responde "quais são os meus casamentos". */
  const proprios = computed<WeddingMembership[]>(() =>
    authStore.memberships.filter((membership) => !membership.acessoDeSuporte),
  )

  /** Acessos de suporte abertos agora, para dar o caminho de volta. */
  const deSuporte = computed<WeddingMembership[]>(() =>
    authStore.memberships.filter((membership) => membership.acessoDeSuporte),
  )

  return { proprios, deSuporte }
}
