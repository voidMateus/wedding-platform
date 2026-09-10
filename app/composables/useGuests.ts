import { nomeDoArquivoDaExportacao } from '#shared/utils/exportacao-convidados'
import type {
  GuestBulkUpdateInput,
  GuestPartyGroupInput,
  GuestPartySyncInput,
  GuestQuickCreateInput,
} from '#shared/schemas/guests'
import type { FaixaEtariaFiltro } from '#shared/utils/faixa-etaria'
import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { Guest, GuestListItem } from '~/types/guest'

export interface GuestListResponse {
  data: GuestListItem[]
  meta: { page: number; pageSize: number; total: number }
  /** Agregados do recorte inteiro, não só da página — ver /api/guests. */
  summary: {
    confirmed: number
    /**
     * Rascunho da lista no mesmo recorte. Vem sempre, independente de
     * `emConsideracao`, porque o cabeçalho mostra os dois números de uma vez
     * ("142 convidados + 18 em consideração").
     */
    emConsideracao: number
  }
}

interface GuestListParams {
  page?: number
  pageSize?: number
  search?: string
  /** Aceita lista: o filtro da coluna permite marcar mais de um grupo. */
  groupId?: string | string[]
  unassigned?: boolean
  withoutParty?: boolean
  /** Recorte por faixa etária calculada na data do evento — resolvido no banco. */
  ageGroup?: FaixaEtariaFiltro | FaixaEtariaFiltro[]
  /** Status de RSVP, com "pendente" incluindo quem nunca respondeu (view convidados_com_status). */
  statusRsvp?: RsvpStatus | RsvpStatus[]
  /**
   * Ausente lista só convidados de verdade; `true` lista só o rascunho da
   * lista. Os dois conjuntos nunca vêm misturados — ver /api/guests.
   */
  emConsideracao?: boolean
  /** Ordenação pedida pela coluna da tabela — só `nome` tem tradução em SQL (ver /api/guests). */
  sort?: 'nome'
  dir?: 'asc' | 'desc'
}

/**
 * Os números da lista inteira, para o cabeçalho de Convidados. Descrevem o
 * casamento, nunca o recorte da tela — ver `GET /api/guests/overview`.
 */
export interface GuestOverview {
  total: number
  emConsideracao: number
  faixas: { chave: string; total: number }[]
}

export interface GuestDetail extends Guest {
  partyMembers: Guest[]
  invite: { id: string; nome: string } | null
}

interface GuestPartySyncResult {
  primaryGuestId: string
  partyId: string | null
  inviteId: string | null
}

/**
 * `guestIds` volta com o núcleo INTEIRO, na ordem final — que pode ser maior
 * que a seleção enviada: agrupar quem já tinha núcleo traz o núcleo dele
 * junto, senão agrupar o João com o Pedro afastaria a Maria do João.
 */
export interface GuestPartyGroupResult {
  partyId: string
  guestIds: string[]
  inviteId: string | null
}

/**
 * CRUD de guests (CLAUDE.md, seção 15). Toda chamada de rede do client
 * passa por aqui, nunca direto em página/componente (CLAUDE.md, seção 5.1).
 */
export function useGuests() {
  function listGuests(params?: MaybeRefOrGetter<GuestListParams | undefined>) {
    return useFetch<GuestListResponse>('/api/guests', { query: params, key: 'guests' })
  }

  /**
   * Chave fixa: as duas visões de Convidados compartilham a mesma resposta, e
   * ela não muda com filtro — por isso nenhum recorte entra no `key`.
   */
  function getGuestOverview() {
    return useFetch<GuestOverview>('/api/guests/overview', { key: 'guest-overview' })
  }

  function getGuest(id: MaybeRefOrGetter<string>) {
    return useFetch<GuestDetail>(() => `/api/guests/${toValue(id)}`, {
      key: () => `guest-${toValue(id)}`,
    })
  }

  /** Versão imperativa de listGuests, pra busca/autocomplete que dispara sob demanda em vez de reativo. */
  async function fetchGuests(params: GuestListParams): Promise<GuestListResponse> {
    return $fetch<GuestListResponse>('/api/guests', { query: params })
  }

  /** Versão imperativa de getGuest, pra buscar o detalhe de um candidato selecionado num autocomplete. */
  async function fetchGuestDetail(id: string): Promise<GuestDetail> {
    return $fetch<GuestDetail>(`/api/guests/${id}`)
  }

  async function syncGuestParty(input: GuestPartySyncInput): Promise<GuestPartySyncResult> {
    return $fetch<GuestPartySyncResult>('/api/guests/party', { method: 'PUT', body: input })
  }

  /**
   * Agrupa os selecionados da lista como Acompanhantes.
   *
   * Substitui o `reorderGuestParty` que existia aqui: o endpoint de reordenar
   * nunca teve um único chamador, porque a ordem do núcleo sempre foi gravada
   * pelo próprio cadastro (`syncGuestParty`, com `primaryPosition`). Dois
   * caminhos para escrever a mesma coisa, um deles morto, é como o errado
   * acaba ligado depois.
   */
  async function groupGuestsAsParty(input: GuestPartyGroupInput): Promise<GuestPartyGroupResult> {
    return $fetch<GuestPartyGroupResult>('/api/guests/party/group', {
      method: 'POST',
      body: input,
    })
  }

  /**
   * Entrada rápida do Modo Lista — só o nome é obrigatório. Não substitui
   * `syncGuestParty`, que é o wizard completo (acompanhantes + convite).
   */
  async function createGuest(input: GuestQuickCreateInput): Promise<Guest> {
    return $fetch<Guest>('/api/guests', { method: 'POST', body: input })
  }

  /**
   * Aplica o mesmo valor a vários convidados (grupo ou faixa manual). Campo
   * ausente é "não mexer" — ver `guestBulkUpdateSchema`.
   */
  async function bulkUpdateGuests(input: GuestBulkUpdateInput): Promise<{ atualizados: number }> {
    return $fetch<{ atualizados: number }>('/api/guests/bulk', { method: 'PATCH', body: input })
  }

  async function deleteGuest(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/guests/${id}`, { method: 'DELETE' })
  }

  /**
   * Baixa a exportação do **recorte atual** — os mesmos filtros da listagem
   * (`GuestListParams`), para o arquivo casar com o que está na tela.
   *
   * Recebe o CSV como blob em vez de deixar o navegador navegar até a URL:
   * `/api/guests/export` exige a sessão do Supabase, e uma navegação direta
   * sairia do contexto do app. O `Content-Disposition` do servidor define o
   * nome; aqui ele é reaplicado porque um download de blob não o lê.
   */
  async function exportGuests(params: GuestListParams = {}): Promise<void> {
    // Só os recortes: `page`/`pageSize`/`sort` não vão junto de propósito — o
    // CSV é a lista inteira do filtro, em ordem de nome, não a página que
    // está na tela.
    const query = {
      search: params.search || undefined,
      groupId: params.groupId || undefined,
      ageGroup: params.ageGroup || undefined,
      statusRsvp: params.statusRsvp || undefined,
      // Vai junto porque o rascunho é um recorte como qualquer outro: exportar
      // o painel "Em consideração" tem que baixar o rascunho, não a lista de
      // convidados (a promessa do botão é "o que está na tela").
      emConsideracao: params.emConsideracao || undefined,
    }

    const blob = await $fetch<Blob>('/api/guests/export', { query, responseType: 'blob' })

    const url = URL.createObjectURL(blob)
    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = nomeDoArquivoDaExportacao(new Date())
    ancora.click()
    URL.revokeObjectURL(url)
  }

  return {
    listGuests,
    getGuestOverview,
    getGuest,
    fetchGuests,
    fetchGuestDetail,
    createGuest,
    bulkUpdateGuests,
    syncGuestParty,
    groupGuestsAsParty,
    deleteGuest,
    exportGuests,
  }
}
