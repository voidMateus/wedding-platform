import {
  campoPorChave,
  detectarCampo,
  interpretarValorDeEnum,
  normalizarCabecalho,
  type CampoConvidado,
} from './campos-convidado'
import { ehLinhaDeExemplo } from './modelo-importacao'
import { guestImportRowSchema, type GuestImportRow } from '#shared/schemas/guest-import'

/**
 * Preparo da planilha: das células cruas até as linhas que o servidor aceita.
 *
 * Roda no client (é o que alimenta a revisão antes de qualquer escrita), mas é
 * função pura e o servidor revalida o resultado com o mesmo schema Zod — o
 * client nunca é fonte de verdade.
 *
 * A regra que atravessa o arquivo inteiro: **coluna não mapeada não vira campo
 * ausente com valor nulo, vira campo que não existe na linha.** É o que
 * permite que uma planilha de três colunas atualize só três colunas.
 */

export interface MapeamentoColuna {
  indice: number
  cabecalho: string
  /** `null` = coluna que o sistema não reconheceu ou que o casal desligou. */
  chave: string | null
}

export interface ProblemaLinha {
  /** Número da linha na planilha, contando o cabeçalho como 1 (igual ao Excel). */
  linha: number
  campo?: string
  mensagem: string
}

export interface LinhaPreparada {
  linha: number
  dados: GuestImportRow
  /** Só para a revisão: o que a linha vai fazer. */
  acao: 'criar' | 'atualizar'
}

export interface ResumoImportacao {
  criar: number
  atualizar: number
  /** Nomes distintos citados na planilha, na ordem em que aparecem. */
  grupos: string[]
  convites: string[]
}

export interface ResultadoPreparacao {
  linhas: LinhaPreparada[]
  erros: ProblemaLinha[]
  avisos: ProblemaLinha[]
  /** Linhas de exemplo do modelo que o casal esqueceu de apagar. */
  exemplosIgnorados: number
  resumo: ResumoImportacao
}

/**
 * Casa cada coluna da planilha com um campo do catálogo. Campos derivados
 * casam de propósito — o importador precisa reconhecê-los para AVISAR que
 * serão ignorados, em vez de tratá-los como coluna desconhecida.
 */
export function detectarMapeamento(cabecalho: readonly string[]): MapeamentoColuna[] {
  const jaUsadas = new Set<string>()

  return cabecalho.map((texto, indice) => {
    const campo = detectarCampo(texto)
    // Duas colunas apontando para o mesmo campo: só a primeira vale, senão a
    // segunda sobrescreveria a primeira em silêncio.
    const disponivel = campo && !jaUsadas.has(campo.chave)
    if (disponivel) jaUsadas.add(campo.chave)

    return { indice, cabecalho: texto, chave: disponivel ? campo.chave : null }
  })
}

/**
 * Aceita "AAAA-MM-DD" (o que o modelo gera e o que o Excel produz ao formatar
 * como data ISO) e "DD/MM/AAAA" (o que uma pessoa digita no Brasil). Devolve
 * sempre ISO, ou `null` se não for data de verdade — 31/02 é recusado, não
 * "corrigido" para 03/03.
 */
export function normalizarDataDeNascimento(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return null

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(texto)
  const brasileiro = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto)

  let ano: number, mes: number, dia: number
  if (iso) {
    ano = Number(iso[1])
    mes = Number(iso[2])
    dia = Number(iso[3])
  } else if (brasileiro) {
    dia = Number(brasileiro[1])
    mes = Number(brasileiro[2])
    ano = Number(brasileiro[3])
  } else {
    return null
  }

  // `Date.UTC` normaliza silenciosamente (31/02 vira 03/03), então a
  // verificação é comparar os componentes de volta.
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${ano}-${pad(mes)}-${pad(dia)}`
}

function listaDeValores(campo: CampoConvidado): string {
  return (campo.valores ?? []).map((valor) => valor.rotulo).join(', ')
}

interface CelulaInterpretada {
  valor?: string
  erro?: string
}

/** Traduz o que foi digitado para o valor que o schema aceita. */
function interpretarCelula(campo: CampoConvidado, bruto: string): CelulaInterpretada {
  const texto = bruto.trim()

  // Célula vazia numa coluna presente é intenção de limpar o campo — só que
  // limpar o NOME não é uma intenção válida, e limpar o id não faz sentido.
  if (!texto) return { valor: '' }

  if (campo.chave === 'data_nascimento') {
    const iso = normalizarDataDeNascimento(texto)
    return iso
      ? { valor: iso }
      : { erro: `"${texto}" não é uma data válida. Use AAAA-MM-DD ou DD/MM/AAAA.` }
  }

  if (campo.valores) {
    const valor = interpretarValorDeEnum(campo, texto)
    return valor ? { valor } : { erro: `"${texto}" não é aceito. Use: ${listaDeValores(campo)}.` }
  }

  return { valor: texto }
}

export interface OpcoesPreparacao {
  /**
   * Nomes de grupo e convite que já existem no casamento — só para a revisão
   * saber quais seriam **criados**. A resolução de verdade acontece no
   * servidor, dentro da transação.
   */
  gruposExistentes?: readonly string[]
  convitesExistentes?: readonly string[]
}

function nomesNovos(citados: readonly string[], existentes: readonly string[]): string[] {
  const conhecidos = new Set(existentes.map(normalizarCabecalho))
  return citados.filter((nome) => !conhecidos.has(normalizarCabecalho(nome)))
}

/**
 * Percorre a planilha inteira e devolve o que será importado, o que está
 * errado e o que será ignorado — tudo de uma vez, para a revisão poder mostrar
 * o quadro completo antes de qualquer escrita.
 */
export function prepararImportacao(
  linhasCsv: readonly (readonly string[])[],
  mapeamento: readonly MapeamentoColuna[],
  opcoes: OpcoesPreparacao = {},
): ResultadoPreparacao {
  const linhas: LinhaPreparada[] = []
  const erros: ProblemaLinha[] = []
  const avisos: ProblemaLinha[] = []
  let exemplosIgnorados = 0

  const gruposCitados: string[] = []
  const convitesCitados: string[] = []

  const mapeadas = mapeamento.filter((coluna) => coluna.chave !== null)

  // Aviso de cabeçalho, uma vez só — repetido por linha viraria ruído.
  for (const coluna of mapeamento) {
    if (!coluna.chave) {
      if (coluna.cabecalho.trim()) {
        avisos.push({
          linha: 1,
          mensagem: `Coluna "${coluna.cabecalho}" não reconhecida — ignorada.`,
        })
      }
      continue
    }
    const campo = campoPorChave(coluna.chave)
    if (campo?.importacao === 'nao') {
      avisos.push({
        linha: 1,
        mensagem: `Coluna "${campo.rotulo}" é calculada pelo sistema — será ignorada na importação.`,
      })
    }
  }

  const gravaveis = mapeadas.filter((coluna) => {
    const campo = campoPorChave(coluna.chave!)
    return campo && campo.importacao !== 'nao'
  })

  const indiceDoNome = mapeamento.find((coluna) => coluna.chave === 'nome_completo')?.indice ?? -1

  // Da segunda linha em diante: a primeira é o cabeçalho.
  for (let i = 1; i < linhasCsv.length; i++) {
    const celulas = linhasCsv[i]!
    const numeroDaLinha = i + 1

    if (indiceDoNome >= 0 && ehLinhaDeExemplo(celulas[indiceDoNome])) {
      exemplosIgnorados++
      continue
    }

    const dados: Record<string, string> = {}
    let linhaTemErro = false

    for (const coluna of gravaveis) {
      const campo = campoPorChave(coluna.chave!)!
      const { valor, erro } = interpretarCelula(campo, celulas[coluna.indice] ?? '')

      if (erro) {
        erros.push({ linha: numeroDaLinha, campo: campo.rotulo, mensagem: erro })
        linhaTemErro = true
        continue
      }
      // Chave presente com string vazia = limpar. Só o id foge disso: id vazio
      // significa "linha de cadastro novo", não "apagar o identificador".
      if (valor === '' && campo.chave === 'id') continue
      dados[campo.chave] = valor!
    }

    if (linhaTemErro) continue

    const resultado = guestImportRowSchema.safeParse(dados)
    if (!resultado.success) {
      for (const problema of resultado.error.issues) {
        const chave = String(problema.path[0] ?? '')
        erros.push({
          linha: numeroDaLinha,
          campo: campoPorChave(chave)?.rotulo ?? chave,
          mensagem: problema.message,
        })
      }
      continue
    }

    const linha = resultado.data

    // A data de nascimento sempre vence a faixa informada à mão (CLAUDE.md,
    // seção 12) — avisar é obrigatório, porque a coluna preenchida na planilha
    // simplesmente não terá efeito.
    if (linha.data_nascimento && linha.faixa_etaria_manual) {
      avisos.push({
        linha: numeroDaLinha,
        campo: 'Faixa etária (informada)',
        mensagem: 'Tem data de nascimento — a faixa informada à mão será ignorada.',
      })
    }

    if (
      linha.grupo &&
      !gruposCitados.some((nome) => normalizarCabecalho(nome) === normalizarCabecalho(linha.grupo!))
    ) {
      gruposCitados.push(linha.grupo)
    }
    if (
      linha.convite &&
      !convitesCitados.some(
        (nome) => normalizarCabecalho(nome) === normalizarCabecalho(linha.convite!),
      )
    ) {
      convitesCitados.push(linha.convite)
    }

    linhas.push({ linha: numeroDaLinha, dados: linha, acao: linha.id ? 'atualizar' : 'criar' })
  }

  return {
    linhas,
    erros,
    avisos,
    exemplosIgnorados,
    resumo: {
      criar: linhas.filter((item) => item.acao === 'criar').length,
      atualizar: linhas.filter((item) => item.acao === 'atualizar').length,
      grupos: nomesNovos(gruposCitados, opcoes.gruposExistentes ?? []),
      convites: nomesNovos(convitesCitados, opcoes.convitesExistentes ?? []),
    },
  }
}

/** Fatia as linhas em lotes do tamanho que o endpoint aceita. */
export function dividirEmLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho))
  }
  return lotes
}
