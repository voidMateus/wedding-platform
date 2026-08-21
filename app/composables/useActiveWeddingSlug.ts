/**
 * Slug do casamento ativo no painel administrativo, lido da rota
 * `/admin/{slug}/**` (docs/PLANO-SAAS.md, Passo 3) — espelha
 * `useWeddingSlug()` do site público. Usado só pra navegação/exibição no
 * client; a autorização de verdade é sempre resolvida no servidor a partir
 * do JWT (CLAUDE.md, seção 4.2) — este valor nunca é a fonte de decisão de
 * acesso, só o que aparece na URL.
 */
export function useActiveWeddingSlug(): string {
  const route = useRoute()
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : ''
}
