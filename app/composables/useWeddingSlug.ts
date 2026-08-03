/**
 * Slug do casamento atual, lido da rota pública `/{slug}/**` (CLAUDE.md,
 * seção 4.4/33) — cada casamento tem sua própria URL. Usado por todo
 * composable público para montar a chamada certa a `/api/public/{slug}/**`.
 */
export function useWeddingSlug(): string {
  const route = useRoute()
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : ''
}
