import type { ConcederOperadorInput } from '#shared/schemas/operadores-plataforma'

export interface OperadorDaPlataforma {
  usuarioId: string
  email: string | null
  desde: string
  /** Quem está olhando. A autoalteração é proibida (decisão 4.7). */
  souEu: boolean
}

export interface EventoAlcancado {
  casamentoId: string
  slug: string
  nomesNoivos: string
  dataEvento: string
}

export interface AcessoDePessoa extends EventoAlcancado {
  papel: string
}

export interface SuporteDePessoa extends EventoAlcancado {
  expiraEm: string
}

export interface AcessosDeUmaPessoa {
  email: string
  encontrado: boolean
  acessos: AcessoDePessoa[]
  suportes: SuporteDePessoa[]
}

/**
 * Contas e acessos da plataforma (docs/fase6-contas-e-acessos.md).
 *
 * Como `usePlatformOverview`, a chave NÃO carrega slug: esta visão é
 * deliberadamente cross-tenant, e escopá-la a um casamento seria o oposto do
 * que a tela faz.
 *
 * A consulta de acessos é imperativa (`$fetch`) e não `useFetch`: ela responde
 * a um e-mail digitado, então não tem o que buscar até alguém perguntar — e um
 * `useFetch` reativo dispararia uma requisição por tecla.
 */
export function usePlatformAccounts() {
  function getOperators() {
    return useFetch<{ data: OperadorDaPlataforma[] }>('/api/platform/operators', {
      key: 'platform-operators',
    })
  }

  async function grantOperator(input: ConcederOperadorInput) {
    return $fetch<{ data: { usuarioId: string; email: string; concedido: boolean } }>(
      '/api/platform/operators',
      { method: 'POST', body: input },
    )
  }

  async function revokeOperator(usuarioId: string) {
    return $fetch<{ data: { usuarioId: string; revogado: boolean } }>(
      `/api/platform/operators/${usuarioId}`,
      { method: 'DELETE' },
    )
  }

  async function lookupAccess(email: string) {
    const resposta = await $fetch<{ data: AcessosDeUmaPessoa }>('/api/platform/access', {
      query: { email },
    })
    return resposta.data
  }

  return { getOperators, grantOperator, revokeOperator, lookupAccess }
}
