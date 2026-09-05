import {
  CAMPOS_CONVIDADO,
  camposImportaveis,
  type CampoConvidado,
} from '#shared/utils/campos-convidado'
import {
  gerarModeloImportacao,
  nomeDoArquivoDoModelo,
  ordenarCampos,
  presetsModelo,
  type ChavePreset,
  type PresetModelo,
} from '#shared/utils/modelo-importacao'

/**
 * Gerador de modelo de planilha de importação (CLAUDE.md, seção 4.1 — toda
 * chamada de rede do client passa por um composable).
 *
 * Aqui não há chamada de rede nenhuma: o modelo é montado inteiramente a
 * partir do catálogo de campos, que é código compartilhado. O composable
 * existe pelo outro motivo — encapsular o efeito colateral do download
 * (Blob + âncora + revoke), que não pertence ao template de um componente.
 */
export function useGuestImportTemplate() {
  /** Campos que podem virar coluna do modelo, na ordem do catálogo. */
  const fields: CampoConvidado[] = camposImportaveis()

  const presets: PresetModelo[] = presetsModelo()

  /**
   * Qual preset corresponde exatamente à seleção atual — o chip só fica ativo
   * quando o conjunto bate, para "Personalizado" não se disfarçar de
   * "Recomendado" depois de o casal desmarcar uma coluna.
   */
  function matchingPreset(selected: readonly string[]): ChavePreset | null {
    const atual = ordenarCampos(selected).join('|')

    return presets.find((preset) => ordenarCampos(preset.campos).join('|') === atual)?.chave ?? null
  }

  /**
   * Descrição legível do que o arquivo vai conter, para a tela não obrigar
   * ninguém a contar caixas marcadas.
   */
  function summary(selected: readonly string[]): string {
    const total = ordenarCampos(selected).length
    if (total === 0) return 'Nenhuma coluna selecionada'
    return `${total} ${total === 1 ? 'coluna' : 'colunas'}`
  }

  function download(selected: readonly string[], options: { withExample?: boolean } = {}): void {
    const colunas = ordenarCampos(selected)
    if (colunas.length === 0) return

    const csv = gerarModeloImportacao(colunas, { comExemplo: options.withExample ?? true })
    const nome = nomeDoArquivoDoModelo(matchingPreset(colunas) ?? 'personalizado', new Date())

    // `text/csv` com charset explícito: o BOM já resolve o Excel, mas sem o
    // charset o navegador pode rotular o download como latin-1 e alguns
    // leitores respeitam o rótulo em vez do conteúdo.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = nome
    ancora.click()

    // Sem o revoke o Blob fica retido enquanto a aba viver — o casal pode
    // gerar vários modelos seguidos até acertar as colunas.
    URL.revokeObjectURL(url)
  }

  return { fields, presets, matchingPreset, summary, download, allFields: CAMPOS_CONVIDADO }
}
