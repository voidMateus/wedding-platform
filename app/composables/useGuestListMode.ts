import type { GuestListResponse } from '~/composables/useGuests'
import type { GuestListItem } from '~/types/guest'

/**
 * Carga do Modo Lista: a lista **inteira** de convidados, mais o rascunho.
 *
 * Por que inteira, e não paginada como a Visão organizada: aqui a lista é
 * agrupada em blocos e os contadores por faixa etária descrevem o conjunto —
 * as duas coisas são impossíveis com uma página de 25 na mão. É também o que
 * dá a sensação de planilha: filtrar e recolher blocos não custa ida ao
 * servidor.
 *
 * Reusa `GET /api/guests` em vez de um endpoint próprio de propósito. Uma
 * segunda rota de listagem seria um segundo lugar para os filtros divergirem —
 * é o problema que a exportação já documenta ("filtro que existisse só num dos
 * dois faria o CSV descrever uma lista diferente"). O preço é um laço de
 * páginas, que fica todo aqui dentro.
 */

/** O teto que `paginationQuerySchema` impõe — pedir mais devolve 400. */
const TAMANHO_DA_PAGINA = 100

/**
 * Guarda de sanidade do laço. O maior casamento real fica muito abaixo disso;
 * existe para um `meta.total` inconsistente não virar laço infinito.
 */
const MAXIMO_DE_PAGINAS = 60

export interface GuestListModeData {
  /** Convidados de verdade, já sem rascunho (o endpoint separa os conjuntos). */
  convidados: GuestListItem[]
  /** Rascunho da lista ("Em consideração") — o painel mostra os nomes. */
  rascunhos: GuestListItem[]
  confirmados: number
}

/** O fetch de `useRequestFetch()` — ver o porquê em `useGuestListMode`. */
type FetchDaRequisicao = ReturnType<typeof useRequestFetch>

async function carregarTodasAsPaginas(
  request: FetchDaRequisicao,
  emConsideracao: boolean,
): Promise<{ linhas: GuestListItem[]; confirmados: number }> {
  const linhas: GuestListItem[] = []
  let confirmados = 0

  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
    const resposta = await request<GuestListResponse>('/api/guests', {
      query: {
        page: pagina,
        pageSize: TAMANHO_DA_PAGINA,
        emConsideracao: emConsideracao || undefined,
      },
    })

    linhas.push(...resposta.data)
    confirmados = resposta.summary.confirmed

    // `meta.total` é do recorte inteiro, então ele é quem diz onde parar —
    // não o tamanho da última página, que só coincide quando o total não é
    // múltiplo exato de TAMANHO_DA_PAGINA.
    if (linhas.length >= resposta.meta.total || !resposta.data.length) break
  }

  return { linhas, confirmados }
}

export function useGuestListMode() {
  // `useRequestFetch()`, e não `$fetch` cru: na renderização no servidor o
  // `$fetch` não repassa os cabeçalhos da requisição que está sendo atendida,
  // então o cookie de sessão do Supabase não chega em `/api/guests` e a
  // listagem volta 401 — sem erro no log do servidor e sem falha de rede no
  // navegador, o que faz o sintoma parecer "a tela não carrega" (foi
  // exatamente assim que apareceu). `useFetch`, que a Visão organizada usa,
  // já faz esse repasse sozinho; aqui o laço de páginas exige a versão
  // imperativa, e com ela o repasse tem que ser explícito.
  const request = useRequestFetch()

  return useAsyncData<GuestListModeData>('guest-list-mode', async () => {
    // Em paralelo: são recortes independentes do mesmo endpoint, e o painel de
    // rascunho aparece junto com a tabela.
    const [reais, rascunho] = await Promise.all([
      carregarTodasAsPaginas(request, false),
      carregarTodasAsPaginas(request, true),
    ])

    return {
      convidados: reais.linhas,
      rascunhos: rascunho.linhas,
      confirmados: reais.confirmados,
    }
  })
}
