import type { Database } from './database.types'
import type {
  BlocoDeAtencao,
  EstagioDoGasto,
  LinhaDeCategoria,
  ResumoDoOrcamento,
  SituacaoFinanceiraFornecedor,
  SituacaoPagamento,
  SituacaoParcela,
  TotaisDaDespesa,
} from '#shared/utils/orcamento'

// Tipos do módulo Financeiro. Os que espelham uma linha de tabela derivam de
// `Row` (nunca redigitados); os agregados que um endpoint monta para exibição
// são declarados aqui.

export type CategoriaOrcamento = Database['public']['Tables']['categorias_orcamento']['Row']
export type Despesa = Database['public']['Tables']['despesas']['Row']
export type ParcelaDespesa = Database['public']['Tables']['parcelas_despesa']['Row']
export type Fornecedor = Database['public']['Tables']['fornecedores']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']

export type {
  SituacaoParcela,
  SituacaoPagamento,
  SituacaoFinanceiraFornecedor,
  LinhaDeCategoria,
  BlocoDeAtencao,
  EstagioDoGasto,
}

/** Despesa com as parcelas e os totais já calculados pelo endpoint. */
export interface DespesaComParcelas extends Despesa {
  parcelas: ParcelaDespesa[]
  categoria: Pick<CategoriaOrcamento, 'id' | 'nome'> | null
  fornecedor: Pick<Fornecedor, 'id' | 'nome'> | null
  totais: TotaisDaDespesa
}

/** Uma categoria com as despesas dela — o nível de cima da árvore do Orçamento. */
export interface CategoriaComDespesas extends LinhaDeCategoria {
  ordemExibicao: number
  despesas: DespesaComParcelas[]
}

export interface FornecedorComSituacao extends Fornecedor {
  categoria: Pick<CategoriaOrcamento, 'id' | 'nome'> | null
  /** O gasto que este fornecedor cota — é o que agrupa as propostas concorrentes. */
  gasto: Pick<Despesa, 'id' | 'descricao'> | null
  situacaoFinanceira: SituacaoFinanceiraFornecedor
  contratadoCentavos: number
  aPagarCentavos: number
  totalDespesas: number
  /** Propostas anexadas (PDF do fornecedor) — separa quem mandou documento de quem só falou um preço. */
  totalDocumentos: number
}

export interface DocumentoComVinculos extends Documento {
  fornecedor: Pick<Fornecedor, 'id' | 'nome'> | null
  despesa: Pick<Despesa, 'id' | 'descricao'> | null
}

/** Entradas já conhecidas pela plataforma — leitura, nunca receita editável. */
export interface EntradasDePresentes {
  totalCentavos: number
  quantidade: number
}

export interface ResumoFinanceiro extends ResumoDoOrcamento {
  entradasPresentes: EntradasDePresentes
  /** `true` quando não há categoria nem despesa — a tela mostra o convite inicial. */
  vazio: boolean
}

/**
 * Uma linha da tela de Pagamentos. Dois tipos convivem: a parcela de verdade e
 * o compromisso contratado cujo saldo ainda não tem data (`a_definir`) — este
 * existe desde a contratação, para nenhum contrato ficar invisível esperando
 * alguém lembrar de parcelá-lo.
 */
export interface PagamentoListado extends Omit<ParcelaDespesa, 'vence_em'> {
  tipo: 'parcela' | 'a_definir'
  situacao: SituacaoPagamento
  /** Nulo na linha `a_definir`: é exatamente o que falta nela. */
  vence_em: string | null
  totalDeParcelas: number
  despesa: Pick<Despesa, 'id' | 'descricao'>
  // A cor vem junto para a categoria ser reconhecível aqui com o mesmo ponto
  // que a identifica no Orçamento e em Fornecedores.
  categoria: Pick<CategoriaOrcamento, 'id' | 'nome' | 'cor_indice' | 'cor_personalizada'> | null
  fornecedor: Pick<Fornecedor, 'id' | 'nome'> | null
}

/** Os números do topo de Pagamentos — sempre do conjunto todo, nunca do recorte. */
export interface ResumoDePagamentos {
  pago: BlocoDeAtencao
  vencidos: BlocoDeAtencao
  proximos30Dias: BlocoDeAtencao
  aPagar: BlocoDeAtencao
  /** Contratado sem data marcada — o que precisa de uma decisão, não de um pagamento. */
  semData: BlocoDeAtencao
}
