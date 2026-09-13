/**
 * Os gastos que quase todo casamento tem, por categoria.
 *
 * É a resposta à dor que o casal descreveu: *"eu vi categoria por categoria,
 * item a item, e fui pensando 'preciso disso?' — foi isso que fez eu montar
 * meu casamento inicialmente"*. Categoria é balde; o que dá norte é a LINHA.
 *
 * ## As três regras desta lista
 *
 * 1. **Sugestão não é linha no banco.** Nada aqui vira `despesas` sozinho. A
 *    categoria mostra o que falta, apagado, no rodapé dela; o gasto nasce
 *    quando o casal clica e confirma. Sem isso, trinta linhas de "R$ 0,00"
 *    entrariam na lista de Gastos e em todos os agregados — o oposto do que
 *    passamos rodadas limpando.
 *
 * 2. **A sugestão não se esgota.** Ela continua ali depois de o casal usar as
 *    outras, em março como no primeiro dia. O casal pediu "processo contínuo",
 *    não um assistente que roda uma vez e some.
 *
 * 3. **Sem valor sugerido.** O relatório real do casamentos.com que serviu de
 *    referência traz só os nomes — o valor é do casal. Sugerir "R$ 12.000 de
 *    buffet" ancoraria uma expectativa que está errada na maior parte do
 *    Brasil, e com ar de autoridade.
 *
 * ## De onde vem
 *
 * Da checklist de fornecedores de uma cerimonial em atividade somada aos itens
 * que o casamentos.com pré-cria — as duas fontes que o casal trouxe, não a
 * nossa imaginação.
 *
 * A chave é o NOME da categoria do catálogo (`orcamento-categorias.ts`).
 * Categoria renomeada pelo casal simplesmente deixa de receber sugestão, e isso
 * é o certo: "Bebidas do Zé" não é mais a nossa "Bebidas", e insistir em
 * palpitar ali seria adivinhação.
 */
export const ITENS_SUGERIDOS_POR_CATEGORIA: Readonly<Record<string, readonly string[]>> = {
  'Espaço e estrutura': [
    'Locação do espaço da festa',
    'Local da cerimônia',
    'Espaço para o dia da noiva',
    'Gerador',
    'Tendas e climatização',
  ],
  'Cerimônia e assessoria': [
    'Assessoria e cerimonial',
    'Celebrante',
    'Cartório e habilitação',
    'Assessoria da cerimônia religiosa',
  ],
  Buffet: ['Buffet', 'Serviço de garçons', 'Mesa de entradas', 'Lanche da madrugada'],
  Bebidas: [
    'Bar de drinks',
    'Barril de chopp',
    'Bebidas extras',
    'Canoa de água de coco',
    'Espumante do brinde',
  ],
  'Bolo e doces': ['Bolo de casamento', 'Doces finos', 'Bem-casados', 'Mesa de doces'],
  'Decoração e flores': [
    'Decoração da festa',
    'Flores da cerimônia',
    'Buquê da noiva',
    'Iluminação',
  ],
  Música: ['Banda ou DJ da festa', 'Música da cerimônia', 'Som e iluminação de pista', 'Receptivo'],
  'Fotografia e vídeo': ['Fotografia', 'Filmagem', 'Making of da noiva', 'Pré-wedding', 'Drone'],
  'Vestuário e beleza': [
    'Vestido da noiva',
    'Traje do noivo',
    'Sapatos e acessórios',
    'Cabelo e maquiagem',
    'Alianças',
  ],
  'Atrativos da festa': [
    'Cabine fotográfica',
    'Totem de selfie',
    'Brindes de pista',
    'Chuva de prata',
  ],
  'Papelaria e lembranças': [
    'Convites',
    'Save the date',
    'Lembrancinhas',
    'Kit banheiro',
    'Papelaria personalizada',
  ],
  Transporte: ['Carro dos noivos', 'Transporte dos convidados'],
  'Lua de mel': ['Passagens', 'Hospedagem', 'Passeios'],
}

/** Comparação tolerante a caixa e espaço — "buffet" já cadastrado cobre "Buffet". */
function normalizar(texto: string): string {
  return texto.trim().toLowerCase()
}

/**
 * O que ainda falta na categoria: as sugestões que o casal não cadastrou.
 *
 * Some item a item conforme ele cadastra, e some por completo quando ele já tem
 * tudo — mas nunca "expira" por tempo ou por uso.
 */
export function sugestoesQueFaltam(
  nomeDaCategoria: string,
  gastosExistentes: readonly string[],
): readonly string[] {
  const catalogo = ITENS_SUGERIDOS_POR_CATEGORIA[nomeDaCategoria]
  if (!catalogo) return []

  const jaExistem = new Set(gastosExistentes.map(normalizar))
  return catalogo.filter((item) => !jaExistem.has(normalizar(item)))
}
