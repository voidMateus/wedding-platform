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
 *
 * ## De onde a lista vem
 *
 * Da checklist de fornecedores de uma cerimonial em atividade (2026-09-12), e
 * não da nossa imaginação. Confrontar o catálogo com ela apontou três buracos
 * que nenhum de nós tinha visto:
 *
 * 1. **Assessoria/cerimonial não existia.** A própria profissional que organiza
 *    o casamento — e uma das maiores linhas do orçamento — caía em "Outros".
 * 2. **Atrativos da festa não existiam.** Cabine fotográfica, totem, brindes de
 *    pista: um gênero inteiro de gasto moderno, que ou virava "Outros" ou
 *    entrava errado em "Fotografia e vídeo".
 * 3. **Estrutura não existia.** Gerador, tenda, iluminação — coisas que o
 *    espaço não inclui e que ninguém lembra até faltar.
 *
 * E expôs uma categoria que sobrava: **"Outros"**. A tela já agrupa gasto sem
 * categoria sob "Sem categoria"; ter as duas cria dois baldes com o mesmo
 * significado, e o casal passa a ter que escolher entre eles.
 *
 * ## Por que exatamente doze
 *
 * `TAMANHO_PALETA_CATEGORIAS` é 12: a partir da décima terceira os slots de cor
 * se repetem, e duas categorias nascem com a mesma cor. Repetir é aceitável
 * quando o casal chega lá por conta própria — mas o catálogo que a plataforma
 * sugere não pode nascer com cor duplicada. O teto de doze é, portanto, regra
 * desta lista, não coincidência.
 *
 * Ficaram de fora, deliberadamente, duas linhas da checklist:
 *
 * - **Lua de mel**: é dinheiro gasto depois do casamento, e muitas vezes vindo
 *   dos presentes. Somá-la ao teto do casamento faria "quanto já comprometi"
 *   responder por dois orçamentos ao mesmo tempo.
 * - **Traje da noiva/noivo separados**: a checklist tem os dois, mas eles são
 *   dois GASTOS dentro de "Vestuário e beleza" — categoria é o balde, não a
 *   linha.
 */
export interface CategoriaSugerida {
  nome: string
  ordemExibicao: number
}

export const CATEGORIAS_ORCAMENTO_SUGERIDAS: readonly CategoriaSugerida[] = [
  // "e estrutura" não é enfeite: gerador, tenda e banheiro de apoio não vêm
  // com o espaço, e sem um lugar para eles viravam gasto sem categoria.
  { nome: 'Espaço e estrutura', ordemExibicao: 0 },
  // Junta celebrante, cartório e assessoria: é tudo "o que faz a cerimônia
  // acontecer", e separar celebrante de assessoria gastava dois dos doze slots
  // para dividir o que o casal contrata como um assunto só.
  { nome: 'Cerimônia e assessoria', ordemExibicao: 1 },
  { nome: 'Buffet', ordemExibicao: 2 },
  { nome: 'Bebidas', ordemExibicao: 3 },
  { nome: 'Bolo e doces', ordemExibicao: 4 },
  { nome: 'Decoração e flores', ordemExibicao: 5 },
  { nome: 'Música', ordemExibicao: 6 },
  { nome: 'Fotografia e vídeo', ordemExibicao: 7 },
  { nome: 'Vestuário e beleza', ordemExibicao: 8 },
  // Cabine fotográfica, totem, canoa de água de coco, brindes de pista.
  { nome: 'Atrativos da festa', ordemExibicao: 9 },
  // Convites, save the date, personalizados, lembrancinhas e kit banheiro —
  // tudo o que é impresso ou entregue na mão do convidado.
  { nome: 'Papelaria e lembranças', ordemExibicao: 10 },
  { nome: 'Transporte', ordemExibicao: 11 },
] as const
