import { qualificarSubgrupo } from '#shared/utils/grupos'

/**
 * Opções de seletor/filtro de grupo, com a subdivisão sempre qualificada pelo
 * grupo-pai ("Família do Mateus › Primos").
 *
 * Existe porque `GET /api/groups` devolve grupos e subdivisões na mesma lista
 * (é uma tabela só — `grupos.grupo_pai_id`), e mostrar o nome cru deixaria
 * duas opções escritas "Primos" na tela quando duas famílias têm primos, sem
 * nada que permita escolher entre elas.
 *
 * A ordenação pelo rótulo qualificado dá a ordem de árvore de graça: o grupo
 * vem imediatamente antes das próprias subdivisões, porque o nome dele é
 * prefixo do rótulo delas.
 */
export interface GroupOption {
  value: string
  label: string
}

/** Só o que o rótulo precisa — serve para `Group` e para `GroupListItem`. */
interface GrupoRotulavel {
  id: string
  nome: string
  grupo_pai_id: string | null
}

export function montarOpcoesDeGrupo(grupos: readonly GrupoRotulavel[]): GroupOption[] {
  const nomePorId = new Map(grupos.map((grupo) => [grupo.id, grupo.nome]))

  return grupos
    .map((grupo) => {
      const nomeDoPai = grupo.grupo_pai_id ? nomePorId.get(grupo.grupo_pai_id) : undefined

      return {
        value: grupo.id,
        // Subdivisão cujo pai não veio na mesma resposta cai no nome cru: é
        // melhor uma opção sem contexto que uma opção sem rótulo. Acontece
        // quando o pai está arquivado e a listagem só pediu os ativos.
        label: nomeDoPai ? qualificarSubgrupo(nomeDoPai, grupo.nome) : grupo.nome,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}
