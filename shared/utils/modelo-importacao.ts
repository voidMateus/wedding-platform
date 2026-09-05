import {
  CAMPOS_CONVIDADO,
  NOME_DA_LINHA_DE_EXEMPLO,
  camposGravaveis,
  campoPorChave,
  normalizarCabecalho,
} from './campos-convidado'
import { SEPARADOR_PADRAO, serializarCsv } from './csv'

/**
 * Gerador de modelo de importação.
 *
 * O produto precisa responder "como eu preparo uma planilha?" com "escolha os
 * campos e o sistema monta", em vez de obrigar o casal a descobrir sozinho
 * quais colunas existem. O modelo sai do mesmo catálogo que o importador
 * consome (`campos-convidado.ts`), então ele nunca pode oferecer uma coluna
 * que o importador não aceite — a compatibilidade é estrutural, não uma
 * convenção que alguém precisa lembrar de manter.
 *
 * Roda inteiro no client: é só metadado, não há nada a pedir ao servidor.
 */

export type ChavePreset = 'recomendado' | 'completo' | 'atualizacao'

export interface PresetModelo {
  chave: ChavePreset
  rotulo: string
  descricao: string
  campos: readonly string[]
}

/**
 * Enxuto de propósito: só o que faz sentido preencher em massa. Apelido, sexo,
 * papel na cerimônia e observações são refinamento individual — ninguém digita
 * duzentos apelidos numa planilha, digita no cadastro depois. Uma planilha com
 * onze colunas em branco intimida exatamente quem o "recomendado" deveria
 * ajudar.
 */
const CAMPOS_RECOMENDADOS = [
  'nome_completo',
  'data_nascimento',
  'faixa_etaria_manual',
  'email',
  'telefone',
  'grupo',
  'convite',
] as const

export function presetsModelo(): PresetModelo[] {
  const gravaveis = camposGravaveis().map((campo) => campo.chave)

  return [
    {
      chave: 'recomendado',
      rotulo: 'Recomendado',
      descricao: 'O essencial para cadastrar convidados novos.',
      campos: CAMPOS_RECOMENDADOS,
    },
    {
      chave: 'completo',
      rotulo: 'Completo',
      descricao: 'Todos os campos que a importação aceita preencher.',
      campos: gravaveis,
    },
    {
      chave: 'atualizacao',
      rotulo: 'Atualizar existentes',
      // `id` só entra aqui: numa planilha de cadastro novo ele seria uma
      // armadilha (coluna em branco que o casal preenche com 1, 2, 3).
      descricao: 'Inclui o identificador, para corrigir convidados já cadastrados.',
      campos: ['id', ...gravaveis],
    },
  ]
}

export function presetPorChave(chave: ChavePreset): PresetModelo | undefined {
  return presetsModelo().find((preset) => preset.chave === chave)
}

/**
 * Ordena as colunas escolhidas pela ordem do catálogo, e descarta o que o
 * importador não aceitaria — um campo derivado nunca vira coluna de modelo,
 * mesmo que alguém o passe aqui por engano.
 */
export function ordenarCampos(chaves: readonly string[]): string[] {
  const escolhidas = new Set(chaves)

  return CAMPOS_CONVIDADO.filter(
    (campo) => escolhidas.has(campo.chave) && campo.importacao !== 'nao',
  ).map((campo) => campo.chave)
}

/**
 * Linha de exemplo do modelo. Existe porque o cabeçalho sozinho não diz o
 * formato esperado ("data de nascimento" aceita 23/05/1990?), e uma planilha
 * de uma linha só é intimidante.
 *
 * O nome é um marcador legível: se o casal esquecer de apagar a linha, o
 * importador a reconhece por `ehLinhaDeExemplo` e a ignora com aviso, em vez
 * de cadastrar "Maria Exemplo" como convidada.
 */
export function linhaDeExemplo(chaves: readonly string[]): string[] {
  return chaves.map((chave) => {
    const campo = campoPorChave(chave)
    // `id` fica vazio de propósito: preenchê-lo com um exemplo convidaria a
    // inventar identificadores, e o importador trata id inexistente como erro.
    if (!campo || campo.importacao === 'identificador') return ''
    return campo.exemplo ?? ''
  })
}

/**
 * Reconhece a linha de exemplo pelo nome, não por igualdade da linha inteira:
 * o casal costuma sobrescrever uma célula ou outra antes de perceber que devia
 * apagar a linha, e uma comparação exata deixaria "Maria Exemplo" passar.
 */
export function ehLinhaDeExemplo(valorDoNome: string | undefined): boolean {
  if (!valorDoNome) return false
  return normalizarCabecalho(valorDoNome) === normalizarCabecalho(NOME_DA_LINHA_DE_EXEMPLO)
}

export interface OpcoesModelo {
  /** Sem a linha de exemplo, o arquivo sai só com o cabeçalho. */
  comExemplo?: boolean
  separador?: string
}

/**
 * Monta o CSV do modelo. O cabeçalho usa a **chave canônica**
 * (`nome_completo`, não "Nome completo"): é o que a autodetecção do importador
 * casa primeiro e sem ambiguidade. Rótulo visível e descrição aparecem na tela
 * do gerador, onde ajudam de verdade.
 */
export function gerarModeloImportacao(
  chaves: readonly string[],
  opcoes: OpcoesModelo = {},
): string {
  const { comExemplo = true, separador = SEPARADOR_PADRAO } = opcoes
  const colunas = ordenarCampos(chaves)

  const linhas = [colunas]
  if (comExemplo) linhas.push(linhaDeExemplo(colunas))

  return serializarCsv(linhas, { separador, comBom: true })
}

/** `modelo-convidados-recomendado-2026-09-04.csv` */
export function nomeDoArquivoDoModelo(preset: ChavePreset | 'personalizado', hoje: Date): string {
  const data = hoje.toISOString().slice(0, 10)
  return `modelo-convidados-${preset}-${data}.csv`
}
