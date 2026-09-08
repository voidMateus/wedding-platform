/**
 * CSV — serialização e leitura, sem dependência externa.
 *
 * O gerador de modelo e a exportação **escrevem** sempre no formato mais
 * compatível com Excel em português (`;` + BOM UTF-8). A leitura, ao
 * contrário, é deliberadamente mais permissiva do que aquilo que escrevemos:
 * a planilha que volta pode ter passado pelo Google Sheets (que exporta com
 * `,` e sem BOM), pelo Excel em outra localidade, ou ter sido montada do zero
 * pelo casal. Aceitar só o próprio dialeto transformaria "monte a planilha do
 * jeito que você já tem" numa promessa falsa.
 *
 * Escrito à mão em vez de trazer uma biblioteca porque o dialeto envolvido é
 * pequeno e fechado (RFC 4180 com separador variável), e o parser precisa
 * rodar no navegador dentro do wizard de importação — é bundle no caminho do
 * casal.
 */

/** Excel em pt-BR interpreta `,` como decimal; `;` é o separador que ele espera. */
export const SEPARADOR_PADRAO = ';'

/**
 * Sem o BOM, o Excel abre o arquivo em ANSI e todo acento vira caractere
 * quebrado ("João" → "JoÃ£o"). Só o Excel precisa dele — os demais leitores o
 * ignoram, e o parser abaixo o remove na entrada.
 *
 * Montado por `fromCharCode`, e não escrito como literal, de propósito: o
 * caractere U+FEFF é invisível no editor, e uma cópia/colagem descuidada o
 * apagaria sem deixar rastro no diff.
 */
export const BOM_UTF8 = String.fromCharCode(0xfeff)

const SEPARADORES_ACEITOS = [';', ',', '\t'] as const

export type SeparadorCsv = (typeof SEPARADORES_ACEITOS)[number]

/** Precisa de aspas quando o valor carrega o separador, aspas ou quebra de linha. */
function escapar(valor: string, separador: string): string {
  const precisaAspas =
    valor.includes(separador) || valor.includes('"') || valor.includes('\n') || valor.includes('\r')

  return precisaAspas ? `"${valor.replaceAll('"', '""')}"` : valor
}

export interface OpcoesSerializacao {
  separador?: string
  /** BOM só faz sentido no arquivo final; ao comparar strings em teste, atrapalha. */
  comBom?: boolean
}

export function serializarCsv(linhas: string[][], opcoes: OpcoesSerializacao = {}): string {
  const { separador = SEPARADOR_PADRAO, comBom = true } = opcoes

  // CRLF, não LF: é o que a especificação de CSV pede e o que o Excel produz.
  const corpo = linhas
    .map((linha) => linha.map((valor) => escapar(valor ?? '', separador)).join(separador))
    .join('\r\n')

  return `${comBom ? BOM_UTF8 : ''}${corpo}`
}

/**
 * Descobre o separador contando ocorrências **fora de aspas** na primeira
 * linha. Contar no texto inteiro erraria com um campo de observações que
 * contenha `;` ou vírgula; contar dentro de aspas erraria com "Silva, Maria"
 * numa planilha separada por `;`.
 */
export function detectarSeparador(texto: string): SeparadorCsv {
  const primeiraLinha = removerBom(texto).split(/\r?\n/, 1)[0] ?? ''

  let melhor: SeparadorCsv = SEPARADOR_PADRAO
  let melhorContagem = 0

  for (const candidato of SEPARADORES_ACEITOS) {
    let contagem = 0
    let dentroDeAspas = false

    for (const caractere of primeiraLinha) {
      if (caractere === '"') dentroDeAspas = !dentroDeAspas
      else if (caractere === candidato && !dentroDeAspas) contagem++
    }

    if (contagem > melhorContagem) {
      melhor = candidato
      melhorContagem = contagem
    }
  }

  return melhor
}

export function removerBom(texto: string): string {
  return texto.startsWith(BOM_UTF8) ? texto.slice(BOM_UTF8.length) : texto
}

/**
 * Lê o CSV inteiro em uma passada. Uma máquina de estados (e não `split`) é
 * obrigatória: um campo entre aspas pode conter o separador e até quebras de
 * linha, então nem as linhas nem as colunas podem ser cortadas por texto cru.
 *
 * Linhas totalmente vazias são descartadas — Excel costuma deixar uma no fim,
 * e ela viraria um convidado sem nome no meio da revisão.
 */
export function parsearCsv(texto: string, separador?: string): string[][] {
  const conteudo = removerBom(texto)
  const sep = separador ?? detectarSeparador(conteudo)

  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let dentroDeAspas = false

  function fecharCampo() {
    linha.push(campo)
    campo = ''
  }

  function fecharLinha() {
    fecharCampo()
    if (linha.some((valor) => valor.trim() !== '')) linhas.push(linha)
    linha = []
  }

  for (let i = 0; i < conteudo.length; i++) {
    const caractere = conteudo[i]!

    if (dentroDeAspas) {
      if (caractere === '"') {
        // Aspas duplicadas dentro do campo são uma aspa literal.
        if (conteudo[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          dentroDeAspas = false
        }
      } else {
        campo += caractere
      }
      continue
    }

    if (caractere === '"') {
      dentroDeAspas = true
    } else if (caractere === sep) {
      fecharCampo()
    } else if (caractere === '\r') {
      // Consumido junto com o \n seguinte; um \r solitário também encerra linha.
      if (conteudo[i + 1] === '\n') i++
      fecharLinha()
    } else if (caractere === '\n') {
      fecharLinha()
    } else {
      campo += caractere
    }
  }

  // Último campo/linha não terminam em quebra de linha.
  if (campo !== '' || linha.length > 0) fecharLinha()

  return linhas
}
