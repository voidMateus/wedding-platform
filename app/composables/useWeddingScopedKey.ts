/**
 * Chave de `useFetch`/`useAsyncData` presa ao casamento da rota
 * (docs/fase5-multievento.md 5.2).
 *
 * Devolve um getter, e não uma string: quem consome é um composable chamado
 * uma única vez no setup de uma página ou do layout do painel — e o layout
 * NÃO desmonta ao navegar de `/admin/a/**` para `/admin/b/**`. Uma string
 * resolvida no setup congelaria no primeiro casamento visitado; o getter é
 * reavaliado, a chave muda junto com a rota e o Nuxt busca de novo sozinho.
 *
 * É por isso que não existe `refresh()` manual na troca de evento: a
 * invalidação é consequência da chave, não uma linha que alguém precisa
 * lembrar de escrever no próximo composable.
 *
 * Aceita base fixa (`'wedding'`) ou calculada (a chave de uma listagem, que
 * já depende dos filtros) — um helper só, para que a regra "a chave carrega o
 * slug" não tenha um caminho por onde escapar.
 */
export function useWeddingScopedKey(base: string | (() => string)): () => string {
  const route = useRoute()

  return () =>
    weddingScopedKey(
      typeof base === 'function' ? base() : base,
      typeof route.params.slug === 'string' ? route.params.slug : '',
    )
}
