import {
  MAX_LINHAS_IMPORTACAO,
  type GuestImportResult,
  type GuestImportRow,
} from '#shared/schemas/guest-import'
import { parsearCsv } from '#shared/utils/csv'
import {
  detectarMapeamento,
  dividirEmLotes,
  prepararImportacao,
  type MapeamentoColuna,
  type OpcoesPreparacao,
  type ResultadoPreparacao,
} from '#shared/utils/importacao-convidados'

/**
 * Importação em massa de convidados (CLAUDE.md, seção 4.1 — toda chamada de
 * rede do client passa por um composable).
 *
 * O arquivo **nunca sobe cru**: é lido e parseado aqui, o casal revisa o que
 * vai acontecer, e só então as linhas normalizadas viajam como JSON. Isso
 * mantém a revisão instantânea (sem ida e volta a cada ajuste de mapeamento) e
 * o servidor revalidando o mesmo schema Zod, que é quem decide de verdade.
 */
export interface ProgressoImportacao {
  loteAtual: number
  totalDeLotes: number
}

export function useGuestImport() {
  /**
   * Lê o arquivo como texto UTF-8. `FileReader`/`text()` já removem o BOM na
   * decodificação; o parser também tolera, então planilha do Excel e do Google
   * Sheets entram pelo mesmo caminho.
   */
  async function lerArquivo(arquivo: File): Promise<string[][]> {
    const texto = await arquivo.text()
    const linhas = parsearCsv(texto)
    if (linhas.length === 0) {
      throw new Error('A planilha está vazia.')
    }
    return linhas
  }

  function mapearCabecalho(linhas: readonly (readonly string[])[]): MapeamentoColuna[] {
    return detectarMapeamento(linhas[0] ?? [])
  }

  function revisar(
    linhas: readonly (readonly string[])[],
    mapeamento: readonly MapeamentoColuna[],
    opcoes: OpcoesPreparacao,
  ): ResultadoPreparacao {
    return prepararImportacao(linhas, mapeamento, opcoes)
  }

  /**
   * Envia em lotes sequenciais, nunca em paralelo: cada lote é uma transação
   * que resolve/cria grupos e convites por nome, e dois lotes simultâneos
   * citando "Família Silva" poderiam criar dois convites.
   *
   * Cada lote é atômico por si; o conjunto não é. Como a revisão já barrou
   * toda linha inválida, uma falha aqui é erro inesperado — e o resultado
   * parcial é devolvido para a tela poder dizer quanto entrou.
   */
  async function importar(
    linhas: readonly GuestImportRow[],
    criarVinculosNovos: boolean,
    aoProgredir?: (progresso: ProgressoImportacao) => void,
  ): Promise<GuestImportResult> {
    const lotes = dividirEmLotes(linhas, MAX_LINHAS_IMPORTACAO)
    const total: GuestImportResult = {
      criados: 0,
      atualizados: 0,
      gruposCriados: [],
      subgruposCriados: [],
      convitesCriados: [],
    }

    for (const [indice, lote] of lotes.entries()) {
      aoProgredir?.({ loteAtual: indice + 1, totalDeLotes: lotes.length })

      const resultado = await $fetch<GuestImportResult>('/api/guests/import', {
        method: 'POST',
        body: { linhas: lote, criarVinculosNovos },
      })

      total.criados += resultado.criados
      total.atualizados += resultado.atualizados
      total.gruposCriados.push(...resultado.gruposCriados)
      total.subgruposCriados.push(...resultado.subgruposCriados)
      total.convitesCriados.push(...resultado.convitesCriados)
    }

    return total
  }

  return { lerArquivo, mapearCabecalho, revisar, importar, maxLinhasPorLote: MAX_LINHAS_IMPORTACAO }
}
