import { buscarConfiguracoes } from '~/utils/busca-de-configuracoes'

export interface AdminSearchResult {
  type: 'guest' | 'invite' | 'group' | 'setting'
  id: string
  label: string
  sublabel: string | null
  href: string
}

/**
 * Busca global do admin — convidados, convites, grupos e, desde a Fase E da
 * rodada de usabilidade, as seções de Configurações.
 *
 * As duas metades chegam por caminhos diferentes de propósito: pessoa e convite
 * são linhas do banco e vêm do endpoint; seção de configuração é catálogo
 * estático, já no bundle, e resolver isso no navegador é o que faz o resultado
 * aparecer antes da resposta da rede.
 *
 * As configurações vêm PRIMEIRO na lista. Quem digita "contagem" está
 * procurando um ajuste, e um convidado chamado "Contagem" não existe; o
 * contrário — um nome próprio que também é palavra de configuração — é raro, e
 * o custo dele é uma linha a mais para rolar, não um resultado perdido.
 */
export function useAdminSearch() {
  const slug = useActiveWeddingSlug()

  async function search(query: string): Promise<AdminSearchResult[]> {
    const configuracoes: AdminSearchResult[] = buscarConfiguracoes(query, slug).map((secao) => ({
      type: 'setting' as const,
      id: secao.id,
      label: secao.label,
      sublabel: secao.sublabel,
      href: secao.href,
    }))

    // A falha da rede não pode levar junto o resultado que já está na mão: sem
    // este `try`, uma resposta de erro do endpoint de convidados rejeitaria a
    // promessa e apagaria também as seções de configuração — que são catálogo
    // local e não dependem de servidor nenhum.
    let doServidor: AdminSearchResult[] = []
    try {
      const response = await $fetch<{ data: AdminSearchResult[] }>('/api/admin/search', {
        query: { q: query },
      })
      doServidor = response.data
    } catch {
      // Silencioso de propósito: a busca é um atalho, e um toast de erro a cada
      // tecla digitada seria pior que o resultado parcial.
    }

    return [...configuracoes, ...doServidor]
  }

  return { search }
}
