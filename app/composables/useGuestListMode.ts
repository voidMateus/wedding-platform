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

/**
 * Uma ida para descobrir o tamanho, e o resto de uma vez só.
 *
 * O laço era sequencial — página 1, esperar, página 2, esperar — e cada espera
 * é uma viagem de rede inteira. A medição de 24/09/2026 contra a fixture de 520
 * convidados registrou **7 chamadas a `/api/guests` em série**, 1737ms até a
 * última: seis páginas do conjunto real mais a do rascunho. Não era defeito de
 * volume (a auditoria de 2026-09-16 já tinha estabelecido que 200 linhas custam
 * 106ms contra 97ms de 25); era a fila.
 *
 * `meta.total` vem já na primeira resposta, então quantas páginas existem é
 * sabido depois de uma ida — as demais não dependem umas das outras e não
 * precisam se esperar. `Promise.all` preserva a ordem dos argumentos, então a
 * lista continua saindo na mesma sequência de antes; quem decide a ordem é o
 * `ORDER BY` do endpoint, não a ordem de chegada das respostas.
 *
 * `summary.confirmed` passa a vir da primeira página em vez da última. É o
 * mesmo número: o endpoint o calcula numa contagem à parte, sobre o recorte
 * inteiro (`confirmedQuery`), e não sobre a página.
 */
async function carregarTodasAsPaginas(
  request: FetchDaRequisicao,
  emConsideracao: boolean,
): Promise<{ linhas: GuestListItem[]; confirmados: number }> {
  const buscarPagina = (pagina: number) =>
    request<GuestListResponse>('/api/guests', {
      query: {
        page: pagina,
        pageSize: TAMANHO_DA_PAGINA,
        emConsideracao: emConsideracao || undefined,
      },
    })

  const primeira = await buscarPagina(1)
  const confirmados = primeira.summary.confirmed

  // O teto continua valendo: `meta.total` é dado do servidor, e um valor
  // inconsistente não pode virar um disparo de centenas de requisições.
  const paginas = Math.min(Math.ceil(primeira.meta.total / TAMANHO_DA_PAGINA), MAXIMO_DE_PAGINAS)

  if (paginas <= 1 || !primeira.data.length) {
    return { linhas: primeira.data, confirmados }
  }

  const restantes = await Promise.all(
    Array.from({ length: paginas - 1 }, (_, indice) => buscarPagina(indice + 2)),
  )

  return {
    linhas: [primeira.data, ...restantes.map((resposta) => resposta.data)].flat(),
    confirmados,
  }
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
