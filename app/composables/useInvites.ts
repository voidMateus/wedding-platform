import type { InviteInput } from '#shared/schemas/invites'
import type { Invite, InviteDetail, InviteEvent, InviteListItem, InviteStage } from '~/types/invite'

interface InviteListResponse {
  data: InviteListItem[]
  meta: { page: number; pageSize: number; total: number }
}

interface InviteListParams {
  page?: number
  pageSize?: number
  search?: string
  /** 'active' (padrão) esconde arquivados; 'archived' mostra só eles; 'all' junta os dois. */
  archived?: 'active' | 'archived' | 'all'
  /** Status consolidado do convite — resolvido no banco, aceita mais de um valor. */
  stage?: InviteStage | InviteStage[]
  /** Ordenação pedida pela coluna da tabela (ver /api/invites). */
  sort?: 'nome' | 'pessoas' | 'enviado'
  dir?: 'asc' | 'desc'
}

/**
 * CRUD de invites (CLAUDE.md, seção 12.1/19.2). Toda chamada de rede do
 * client passa por aqui, nunca direto em página/componente (CLAUDE.md,
 * seção 5.1).
 */
export function useInvites() {
  /**
   * A chave inclui os PARÂMETROS, e não pode voltar a ser a constante
   * `'invites'`.
   *
   * Três telas chamam esta função com recortes diferentes — a listagem de
   * Convites (com filtro, ordenação e página), o painel do Início (`stage:
   * undefined`, ou seja, sem filtro) e o modal de importação de convidados
   * (`pageSize: 100`). Com uma chave fixa as três compartilham o MESMO estado
   * do `useAsyncData`: a resposta de uma sobrescreve a da outra, e a tela
   * mostra um recorte que ninguém pediu — com o chip do filtro aceso, porque o
   * estado do filtro está na URL e continua certo.
   *
   * É a mesma classe de bug que já mordeu o Financeiro ("a ficha do
   * refrigerante mostrava o contrato do buffet", CLAUDE.md §12) e o mesmo
   * padrão que `getInvite` logo abaixo já usava certo.
   */
  function listInvites(params?: MaybeRefOrGetter<InviteListParams | undefined>) {
    return useFetch<InviteListResponse>('/api/invites', {
      query: params,
      key: useWeddingScopedKey(() => `invites-${JSON.stringify(toValue(params) ?? {})}`),
    })
  }

  function getInvite(id: MaybeRefOrGetter<string>) {
    return useFetch<InviteDetail>(() => `/api/invites/${toValue(id)}`, {
      key: useWeddingScopedKey(() => `invite-${toValue(id)}`),
    })
  }

  /** Versão imperativa de getInvite, pra carregar o convite ao abrir o modal de edição. */
  async function fetchInvite(id: string): Promise<InviteDetail> {
    return $fetch<InviteDetail>(`/api/invites/${id}`)
  }

  /** Versão imperativa de getInviteTimeline, pra carregar a Linha do Tempo dentro do modal de detalhe. */
  async function fetchInviteTimeline(id: string): Promise<{ data: InviteEvent[] }> {
    return $fetch<{ data: InviteEvent[] }>(`/api/invites/${id}/timeline`)
  }

  async function createInvite(input: InviteInput): Promise<Invite> {
    return $fetch<Invite>('/api/invites', { method: 'POST', body: input })
  }

  async function updateInvite(id: string, input: InviteInput): Promise<Invite> {
    return $fetch<Invite>(`/api/invites/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteInvite(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/invites/${id}`, { method: 'DELETE' })
  }

  async function addGuestsToInvite(id: string, guestIds: string[]) {
    return $fetch<{ id: string; addedGuestIds: string[] }>(`/api/invites/${id}/guests`, {
      method: 'POST',
      body: { guestIds },
    })
  }

  async function removeGuestFromInvite(id: string, guestId: string) {
    return $fetch<{ id: string }>(`/api/invites/${id}/guests/${guestId}`, { method: 'DELETE' })
  }

  async function setInviteArchived(id: string, archived: boolean): Promise<Invite> {
    return $fetch<Invite>(`/api/invites/${id}/archive`, { method: 'POST', body: { archived } })
  }

  function getInviteTimeline(id: MaybeRefOrGetter<string>) {
    return useFetch<{ data: InviteEvent[] }>(() => `/api/invites/${toValue(id)}/timeline`, {
      key: useWeddingScopedKey(() => `invite-timeline-${toValue(id)}`),
    })
  }

  return {
    listInvites,
    getInvite,
    fetchInvite,
    fetchInviteTimeline,
    createInvite,
    updateInvite,
    deleteInvite,
    addGuestsToInvite,
    removeGuestFromInvite,
    setInviteArchived,
    getInviteTimeline,
  }
}
