import { serializarCsv } from './csv'
import { formatCentsToBRL } from './format-currency'
import type { SituacaoFinanceiraFornecedor } from './orcamento'

/**
 * A lista de fornecedores, em CSV — o caso de uso que o relatório trouxe e que
 * a decisão original não previu: **passar a lista para a cerimonialista** no dia
 * do evento (rodada de usabilidade de 20/09/2026, ponto 18).
 *
 * Fornecedor continua sem CADASTRO próprio: ele nasce dentro da ficha do gasto
 * que disputa, e é isso que garante que nenhuma cotação exista órfã. O que esta
 * exportação atende é a **leitura** — os mesmos fornecedores somados por
 * casamento respondem uma pergunta que a lista de gastos não responde.
 *
 * Aqui, e não na página, porque é regra de conteúdo: quais colunas saem, em que
 * ordem, e como cada valor vira texto. A página só entrega o arquivo.
 */
export interface FornecedorExportavel {
  nome: string
  gasto: string | null
  categoria: string | null
  nomeContato: string | null
  telefone: string | null
  email: string | null
  contratadoCentavos: number
  aPagarCentavos: number
  situacaoFinanceira: SituacaoFinanceiraFornecedor
}

const ROTULOS_SITUACAO: Record<SituacaoFinanceiraFornecedor, string> = {
  sem_despesa: 'Sem gasto definido',
  a_pagar: 'A pagar',
  quitado: 'Quitado',
}

/**
 * As colunas, na ordem em que quem lê pergunta: quem é, do que cuida, como
 * falar com ele, e só então o dinheiro.
 *
 * Quem imprime esta lista para o dia do evento não precisa do dinheiro — mas
 * quem a exporta para conferir o que falta pagar precisa, e são a mesma lista.
 */
const COLUNAS = [
  'Fornecedor',
  'Gasto',
  'Categoria',
  'Contato',
  'Telefone',
  'E-mail',
  'Valor fechado',
  'Falta pagar',
  'Situação',
] as const

function linhaDoFornecedor(fornecedor: FornecedorExportavel): string[] {
  return [
    fornecedor.nome,
    fornecedor.gasto ?? '',
    fornecedor.categoria ?? '',
    fornecedor.nomeContato ?? '',
    fornecedor.telefone ?? '',
    fornecedor.email ?? '',
    // Zero e "não contratado" são estados diferentes, e a planilha precisa
    // distinguir os dois: célula vazia é ausência, "R$ 0,00" é um valor.
    fornecedor.contratadoCentavos > 0 ? formatCentsToBRL(fornecedor.contratadoCentavos) : '',
    fornecedor.aPagarCentavos > 0 ? formatCentsToBRL(fornecedor.aPagarCentavos) : '',
    ROTULOS_SITUACAO[fornecedor.situacaoFinanceira],
  ]
}

export function montarLinhasDeFornecedores(
  fornecedores: readonly FornecedorExportavel[],
): string[][] {
  return [[...COLUNAS], ...fornecedores.map(linhaDoFornecedor)]
}

export function gerarCsvDeFornecedores(fornecedores: readonly FornecedorExportavel[]): string {
  return serializarCsv(montarLinhasDeFornecedores(fornecedores))
}

/** `fornecedores-2026-09-22.csv` */
export function nomeDoArquivoDeFornecedores(hoje: Date): string {
  return `fornecedores-${hoje.toISOString().slice(0, 10)}.csv`
}
