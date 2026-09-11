/**
 * Catálogo de categorias sugeridas do orçamento — "estrutura pronta +
 * liberdade de planilha" (docs/plano-produto-hub-casamento.md, seção 1).
 *
 * Fonte ÚNICA: o botão "Começar com as categorias sugeridas" do estado vazio
 * insere exatamente esta lista, e é ela que o endpoint revalida. Elas NÃO
 * nascem com o casamento — criar por trigger tiraria do casal a liberdade sem
 * pedir licença, e a lista de um casamento de 40 pessoas não é a de um de 300.
 *
 * `valorPrevistoCentavos` nasce zerado de propósito: sugerir um valor seria
 * inventar o orçamento de alguém.
 */
export interface CategoriaSugerida {
  nome: string
  ordemExibicao: number
}

export const CATEGORIAS_ORCAMENTO_SUGERIDAS: readonly CategoriaSugerida[] = [
  { nome: 'Espaço', ordemExibicao: 0 },
  { nome: 'Buffet', ordemExibicao: 1 },
  { nome: 'Bebidas', ordemExibicao: 2 },
  { nome: 'Bolo e doces', ordemExibicao: 3 },
  { nome: 'Fotografia e vídeo', ordemExibicao: 4 },
  { nome: 'Música', ordemExibicao: 5 },
  { nome: 'Decoração e flores', ordemExibicao: 6 },
  { nome: 'Vestuário e beleza', ordemExibicao: 7 },
  { nome: 'Papelaria e convites', ordemExibicao: 8 },
  { nome: 'Celebrante e cartório', ordemExibicao: 9 },
  { nome: 'Lembrancinhas', ordemExibicao: 10 },
  { nome: 'Transporte', ordemExibicao: 11 },
  { nome: 'Lua de mel', ordemExibicao: 12 },
  { nome: 'Outros', ordemExibicao: 13 },
] as const
