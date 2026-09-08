import { serverSupabaseClient } from '#supabase/server'
import { guestImportSchema, type GuestImportResult } from '#shared/schemas/guest-import'

/**
 * Importação em massa de convidados (caminho administrativo — JWT + RLS).
 *
 * Recebe linhas **já normalizadas em JSON**, nunca o arquivo cru: o parse e o
 * mapeamento de colunas acontecem no client, onde a revisão é montada. Mas o
 * servidor revalida tudo com o mesmo schema Zod — o client nunca é fonte de
 * verdade (CLAUDE.md, seção 4.1).
 *
 * `casamento_id` sai do JWT, jamais do corpo: uma planilha não pode alcançar
 * dado de outro casamento nem citando o `id` certo (CLAUDE.md, seção 4.2 — a
 * cláusula de `casamento_id` no UPDATE da função é o que fecha isso).
 */

/** `GRUPO_INEXISTENTE:12:Família Silva` → linha 12, nome "Família Silva". */
function extrairDetalhe(mensagem: string, prefixo: string): { linha: string; alvo: string } | null {
  const marcador = `${prefixo}:`
  const inicio = mensagem.indexOf(marcador)
  if (inicio === -1) return null

  const resto = mensagem.slice(inicio + marcador.length)
  const separador = resto.indexOf(':')
  if (separador === -1) return null

  return { linha: resto.slice(0, separador), alvo: resto.slice(separador + 1).trim() }
}

export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestImportSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client.rpc('importar_convidados', {
    p_casamento_id: weddingId,
    p_linhas: input.linhas,
    p_criar_vinculos_novos: input.criarVinculosNovos,
  })

  if (error) {
    // Mensagens de negócio da função viram erro legível com o número da linha
    // — "falhou" sem dizer onde é inútil numa planilha de 300 linhas.
    const grupo = extrairDetalhe(error.message, 'GRUPO_INEXISTENTE')
    if (grupo) {
      throw badRequestError(
        `Linha ${grupo.linha}: o grupo "${grupo.alvo}" não existe. Confirme a criação de grupos novos para continuar.`,
      )
    }

    const subgrupo = extrairDetalhe(error.message, 'SUBGRUPO_INEXISTENTE')
    if (subgrupo) {
      throw badRequestError(
        `Linha ${subgrupo.linha}: a subdivisão "${subgrupo.alvo}" não existe nesse grupo. Confirme a criação de grupos novos para continuar.`,
      )
    }

    const subgrupoSemGrupo = extrairDetalhe(error.message, 'SUBGRUPO_SEM_GRUPO')
    if (subgrupoSemGrupo) {
      throw badRequestError(
        `Linha ${subgrupoSemGrupo.linha}: a subdivisão "${subgrupoSemGrupo.alvo}" precisa de um Grupo na mesma linha para saber onde entrar.`,
      )
    }

    const convite = extrairDetalhe(error.message, 'CONVITE_INEXISTENTE')
    if (convite) {
      throw badRequestError(
        `Linha ${convite.linha}: o convite "${convite.alvo}" não existe. Confirme a criação de convites novos para continuar.`,
      )
    }

    const convidado = extrairDetalhe(error.message, 'CONVIDADO_INEXISTENTE')
    if (convidado) {
      throw notFoundError(
        `Linha ${convidado.linha}: nenhum convidado deste casamento tem o identificador informado. Apague a coluna de identificador para cadastrar como novo.`,
      )
    }

    throw badRequestError(error.message)
  }

  const resultado = data as unknown as GuestImportResult

  // Contagens e nomes de grupo/convite criados — nunca nome, e-mail ou
  // telefone de convidado (CLAUDE.md, seção 11).
  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest.import',
    entityType: 'guest',
    entityId: weddingId,
    metadata: {
      criados: resultado.criados,
      atualizados: resultado.atualizados,
      gruposCriados: resultado.gruposCriados.length,
      subgruposCriados: resultado.subgruposCriados.length,
      convitesCriados: resultado.convitesCriados.length,
    },
  })

  return resultado
})
