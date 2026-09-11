import type { Database } from './database.types'
import type {
  BlocoDeAtencao,
  EstagioDoGasto,
  LinhaDeCategoria,
  ResumoDoOrcamento,
  SituacaoFinanceiraFornecedor,
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
  situacaoFinanceira: SituacaoFinanceiraFornecedor
  contratadoCentavos: number
  aPagarCentavos: number
  totalDespesas: number
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

/** Uma linha da tela de Pagamentos: a parcela mais o contexto que a torna reconhecível. */
export interface PagamentoListado extends ParcelaDespesa {
  situacao: SituacaoParcela
  despesa: Pick<Despesa, 'id' | 'descricao'>
  categoria: Pick<CategoriaOrcamento, 'id' | 'nome'> | null
  fornecedor: Pick<Fornecedor, 'id' | 'nome'> | null
}

/** Os quatro números do topo de Pagamentos — sempre do conjunto todo, nunca do recorte. */
export interface ResumoDePagamentos {
  pago: BlocoDeAtencao
  vencidos: BlocoDeAtencao
  proximos30Dias: BlocoDeAtencao
  aPagar: BlocoDeAtencao
}
