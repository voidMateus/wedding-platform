export interface GiftGiverIdentity {
  name: string
  phone: string
}

/**
 * Identidade de quem está presenteando (CLAUDE.md, seção 18) — o token de
 * acesso identifica só o convite (ex.: "Família Silva"), nunca a pessoa
 * específica. Coletada uma vez (nome obrigatório + telefone opcional) e
 * reaproveitada em todos os presentes/contribuições da mesma visita, em vez
 * de perguntar de novo a cada card.
 *
 * useState (não um ref em nível de módulo) — estado em nível de módulo em
 * server/utils seria compartilhado entre requisições concorrentes de
 * convidados diferentes (Node.js reaproveita o módulo entre requests);
 * useState do Nuxt é isolado por requisição no SSR e permanece reativo e
 * compartilhado entre componentes no client depois da hidratação.
 */
export function useGiftGiverIdentity() {
  return useState<GiftGiverIdentity>('gift-giver-identity', () => ({ name: '', phone: '' }))
}
