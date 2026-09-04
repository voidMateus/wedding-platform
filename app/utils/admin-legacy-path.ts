/**
 * Compatibilidade dos links administrativos anteriores ao slug do casamento
 * na URL (`/admin/convidados` → `/admin/{slug}/convidados`).
 *
 * Vive aqui, e não dentro de middleware/auth.global.ts, para ser função pura
 * testável — o middleware só resolve o cookie de casamento ativo e delega.
 */

/**
 * Seções que existiam na estrutura plana `/admin/<seção>`. Lista **histórica
 * e congelada**: seção nova já nasce em `/admin/{slug}/...` e nunca teve URL
 * plana, então não entra aqui — por isso ela não reaproveita a lista de
 * navegação de layouts/admin.vue, que cresce a cada seção nova.
 */
const SECOES_ADMIN_LEGADAS = new Set([
  'convidados',
  'convites',
  'grupos',
  'cronograma',
  'presentes',
  'galeria',
  'configuracoes',
])

/**
 * Traduz um link antigo (`/admin/convidados/novo`) para a URL com slug
 * (`/admin/{slug}/convidados/novo`), preservando o resto do caminho.
 *
 * Devolve `null` (nenhum redirecionamento) quando:
 * - o primeiro segmento não é uma seção legada — URL nova, nada a fazer;
 * - o primeiro segmento é o slug real de um casamento do usuário — um
 *   casamento cujo slug seja literalmente "convidados" manda na URL;
 * - não há casamento ativo resolvível (várias memberships, cookie ausente ou
 *   apontando pra um casamento que não é mais do usuário) — nesse caso o
 *   fluxo normal do middleware manda pra landing /admin, que resolve por lá.
 */
export function resolveDestinoAdminLegado(
  path: string,
  slugsDoUsuario: readonly string[],
  slugDoCookie: string | null,
): string | null {
  const segmentos = path.split('/').filter(Boolean)
  const primeiro = segmentos[1]

  if (!primeiro || !SECOES_ADMIN_LEGADAS.has(primeiro)) {
    return null
  }
  if (slugsDoUsuario.includes(primeiro)) {
    return null
  }

  const slugAtivo =
    (slugDoCookie && slugsDoUsuario.includes(slugDoCookie) ? slugDoCookie : null) ??
    (slugsDoUsuario.length === 1 ? slugsDoUsuario[0]! : null)

  if (!slugAtivo) {
    return null
  }

  return `/admin/${slugAtivo}/${segmentos.slice(1).join('/')}`
}
