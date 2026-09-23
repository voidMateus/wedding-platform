import { z } from 'zod'

// Validação do módulo Financeiro, compartilhada entre client (formulários) e
// server (revalidação — CLAUDE.md, seção 8). Todo valor monetário é inteiro em
// centavos, como em `presentes`: float em dinheiro é erro de arredondamento
// esperando acontecer.

/** Enums de negócio como union de string literal, espelhando o CHECK do Postgres. */
/**
 * A negociação na ordem em que ela acontece — a lista É a progressão, e é dela
 * que sai a ordem do seletor e do filtro. "Descartado" fica no fim porque sai
 * da linha em vez de avançar nela.
 */
export const ESTAGIOS_FORNECEDOR = [
  'pesquisando',
  'contato_feito',
  'cotacao_recebida',
  'em_negociacao',
  'contratado',
  'descartado',
] as const
export type EstagioFornecedor = (typeof ESTAGIOS_FORNECEDOR)[number]

export const TIPOS_DOCUMENTO = ['contrato', 'comprovante', 'referencia', 'outro'] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const FORMAS_PAGAMENTO = [
  'pix',
  'cartao',
  'transferencia',
  'dinheiro',
  'boleto',
  'outro',
] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const ROTULOS_ESTAGIO_FORNECEDOR: Record<EstagioFornecedor, string> = {
  pesquisando: 'Pesquisando',
  contato_feito: 'Contato feito',
  cotacao_recebida: 'Cotação recebida',
  em_negociacao: 'Em negociação',
  contratado: 'Contratado',
  descartado: 'Descartado',
}

export const ROTULOS_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  contrato: 'Contrato',
  comprovante: 'Comprovante',
  referencia: 'Referência',
  outro: 'Outro',
}

export const ROTULOS_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
  outro: 'Outro',
}

/** `date` do Postgres — sempre YYYY-MM-DD, nunca ISO com hora (ver shared/utils/orcamento.ts). */
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')

const valorCentavosSchema = z.coerce
  .number({ message: 'Informe um valor válido.' })
  .int('O valor deve ser um número inteiro de centavos.')
  .min(0, 'O valor não pode ser negativo.')

const uuidOpcional = z.string().uuid('Identificador inválido.').nullish()

const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((valor) => (valor ? valor : null))

// ---------------------------------------------------------------------------
// Categorias do orçamento
// ---------------------------------------------------------------------------
export const budgetCategoryInputSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para a categoria.').max(120),
  valorPrevistoCentavos: valorCentavosSchema.default(0),
  ordemExibicao: z.coerce.number().int().min(0).default(0),
  /**
   * Override manual da cor. Nulo (o normal) deixa a categoria seguir o slot
   * dela na paleta derivada do tema — trocar a cor do casamento repinta tudo.
   * O HEX gravado aqui é a exceção deliberada: quem o define quis aquela cor.
   */
  corPersonalizada: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.')
    .nullish(),
})
export type BudgetCategoryInput = z.infer<typeof budgetCategoryInputSchema>

export const budgetCategoryPatchSchema = budgetCategoryInputSchema.partial()
export type BudgetCategoryPatch = z.infer<typeof budgetCategoryPatchSchema>

/**
 * Teto global do casamento. `null` é valor legítimo — é como o casal apaga o
 * teto e volta a trabalhar só com o planejado por categoria.
 */
export const budgetTotalSchema = z.object({
  orcamentoTotalCentavos: valorCentavosSchema.nullable(),
})
export type BudgetTotalInput = z.infer<typeof budgetTotalSchema>

// ---------------------------------------------------------------------------
// Despesas e parcelas
// ---------------------------------------------------------------------------
/**
 * Como as parcelas nascem junto com a despesa. `depois` é um caminho completo,
 * não um estado incompleto: "fechei o buffet, o pagamento a gente combina" é o
 * começo normal de uma despesa.
 */
/**
 * A entrada — opcional, e ortogonal ao resto do plano.
 *
 * Dar entrada é a forma normal de contratar fornecedor de casamento ("10% para
 * segurar a data, o resto em maio"), e ela combina tanto com "o saldo numa
 * data" quanto com "o saldo parcelado". Por isso é um campo dos dois modos, e
 * não um quarto modo: entrada e forma do saldo são duas perguntas, não uma.
 *
 * Em CENTAVOS, nunca em percentual — o percentual é atalho de digitação na
 * tela. Ver `gerarParcelasComEntrada`.
 */
const entradaSchema = z.object({
  valorCentavos: valorCentavosSchema.refine((valor) => valor > 0, 'A entrada precisa de um valor.'),
  venceEm: dataSchema,
})

export const parcelamentoSchema = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('depois') }),
  z.object({
    modo: z.literal('a_vista'),
    venceEm: dataSchema,
    entrada: entradaSchema.nullish(),
  }),
  z.object({
    modo: z.literal('parcelado'),
    quantidade: z.coerce
      .number()
      .int()
      .min(2, 'Um parcelamento tem pelo menos 2 parcelas.')
      .max(60, 'No máximo 60 parcelas.'),
    primeiroVencimento: dataSchema,
    entrada: entradaSchema.nullish(),
  }),
])
export type ParcelamentoInput = z.infer<typeof parcelamentoSchema>

/**
 * Um gasto tem DOIS valores, de momentos diferentes: o estimado (planejamento)
 * e o final (contrato). Pelo menos um precisa existir — sem nenhum dos dois a
 * linha não diz nada nem ao orçamento nem ao caixa —, e é o final que
 * transforma o gasto em compromisso.
 */
export const expenseInputSchema = z
  .object({
    descricao: z.string().trim().min(1, 'Descreva a despesa.').max(200),
    valorEstimadoCentavos: valorCentavosSchema.nullish(),
    valorCentavos: valorCentavosSchema.nullish(),
    categoriaId: uuidOpcional,
    fornecedorId: uuidOpcional,
    observacao: textoOpcional,
    parcelamento: parcelamentoSchema.optional(),
  })
  .refine(
    (valores) =>
      valores.valorEstimadoCentavos !== null && valores.valorEstimadoCentavos !== undefined
        ? true
        : valores.valorCentavos !== null && valores.valorCentavos !== undefined,
    { message: 'Informe o custo estimado ou o valor já fechado.', path: ['valorEstimadoCentavos'] },
  )
export type ExpenseInput = z.infer<typeof expenseInputSchema>

export const expensePatchSchema = z.object({
  descricao: z.string().trim().min(1).max(200).optional(),
  valorEstimadoCentavos: valorCentavosSchema.nullish(),
  valorCentavos: valorCentavosSchema.nullish(),
  categoriaId: uuidOpcional,
  fornecedorId: uuidOpcional,
  // `.optional()` DEPOIS do transform: sem isso, campo não enviado chegaria
  // como null e apagaria a observação de quem só quis mudar o valor.
  observacao: textoOpcional.optional(),
})
export type ExpensePatch = z.infer<typeof expensePatchSchema>

/**
 * Contratar: o fornecedor cotado vira o custo final de um gasto que já existe
 * no planejamento. É a ponte entre as três telas — e o momento em que o
 * dinheiro deixa de ser estimativa e passa a ter data para sair.
 */
export const vendorContractSchema = z.object({
  despesaId: z.string().uuid('Escolha o gasto correspondente.'),
  valorCentavos: valorCentavosSchema,
  parcelamento: parcelamentoSchema.optional(),
})
export type VendorContractInput = z.infer<typeof vendorContractSchema>

/**
 * **Todo contrato tem um fornecedor** — e ele vem de um dos dois lados: um que
 * já existe (`fornecedorId`, a proposta que ganhou) ou um nome novo
 * (`fornecedorNome`, quem fechou sem ter passado por cotação).
 *
 * Era opcional, e o caminho sem proposta não criava nem vinculava ninguém: o
 * casal que fechava com o buffet sem ter cadastrado cotação ficava com um gasto
 * contratado e **sem contraparte** — sem a quem pendurar documento, sem telefone
 * para a cerimonialista, sem nada a relacionar depois (rodada de usabilidade de
 * 20/09/2026, ponto 17). O `CLAUDE.md` já afirmava que contratar grava o vínculo
 * nos dois sentidos; o que faltava era a porta por onde o fornecedor nasce.
 *
 * A regra vive no schema, e não só na tela, para valer também no servidor — quem
 * fecha um valor sabe com quem fechou, e o atrito é de um campo que já vem
 * preenchido quando há proposta.
 */
const nomeDeFornecedorOpcional = z
  .string()
  .trim()
  .min(1, 'Informe com quem vocês fecharam.')
  .max(160, 'O nome do fornecedor é longo demais.')
  .optional()

const MENSAGEM_SEM_FORNECEDOR = 'Informe com quem vocês fecharam.'

function temFornecedor(valores: {
  fornecedorId?: string | null
  fornecedorNome?: string | null
}): boolean {
  return Boolean(valores.fornecedorId) || Boolean(valores.fornecedorNome)
}

const camposDaContratacao = {
  valorCentavos: valorCentavosSchema,
  parcelamento: parcelamentoSchema.optional(),
  fornecedorId: uuidOpcional,
  fornecedorNome: nomeDeFornecedorOpcional,
}

/**
 * O corpo de `POST /finance/expenses/:id/contract` — a contratação vista do
 * objeto certo (o gasto é quem tem custo final; o fornecedor é quem o cobra).
 *
 * `despesaId` não entra: ele é o parâmetro da rota.
 */
export const expenseContractSchema = z
  .object(camposDaContratacao)
  .refine(temFornecedor, { message: MENSAGEM_SEM_FORNECEDOR, path: ['fornecedorNome'] })
export type ExpenseContractInput = z.infer<typeof expenseContractSchema>

/** O mesmo, do lado do client: a tela também escolhe QUAL gasto está contratando. */
export const registrarContratacaoSchema = z
  .object({
    despesaId: z.string().uuid('Escolha o gasto correspondente.'),
    ...camposDaContratacao,
  })
  .refine(temFornecedor, { message: MENSAGEM_SEM_FORNECEDOR, path: ['fornecedorNome'] })
export type RegistrarContratacaoInput = z.infer<typeof registrarContratacaoSchema>

export const installmentInputSchema = z.object({
  venceEm: dataSchema,
  valorCentavos: valorCentavosSchema.refine((valor) => valor > 0, 'A parcela precisa de um valor.'),
  pagoEm: dataSchema.nullish(),
  formaPagamento: z.enum(FORMAS_PAGAMENTO).nullish(),
  observacao: textoOpcional,
})
export type InstallmentInput = z.infer<typeof installmentInputSchema>

export const installmentPatchSchema = installmentInputSchema.partial()
export type InstallmentPatch = z.infer<typeof installmentPatchSchema>

/** Gerar parcelas de uma despesa já existente — mesma escolha do cadastro. */
export const installmentsGenerateSchema = z.object({
  parcelamento: parcelamentoSchema,
  /** Substituir as parcelas em aberto em vez de somar às existentes. */
  substituirEmAberto: z.boolean().default(false),
})
export type InstallmentsGenerateInput = z.infer<typeof installmentsGenerateSchema>

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------
export const vendorInputSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do fornecedor.').max(160),
  categoriaId: uuidOpcional,
  /** O gasto que este fornecedor cota — é o que põe as propostas concorrentes lado a lado. */
  despesaId: uuidOpcional,
  estagio: z.enum(ESTAGIOS_FORNECEDOR).default('pesquisando'),
  valorPropostoCentavos: valorCentavosSchema.nullish(),
  nomeContato: z.string().trim().max(160).nullish(),
  telefone: z.string().trim().max(40).nullish(),
  email: z.string().trim().email('Informe um e-mail válido.').max(160).nullish().or(z.literal('')),
  siteUrl: z.string().trim().url('Informe uma URL válida.').max(500).nullish().or(z.literal('')),
  observacao: textoOpcional,
})
export type VendorInput = z.infer<typeof vendorInputSchema>

export const vendorPatchSchema = vendorInputSchema.partial()
export type VendorPatch = z.infer<typeof vendorPatchSchema>

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------
/**
 * O documento é um arquivo enviado OU um link externo (XOR no banco). Este
 * schema cobre só o caminho do link: o upload chega por multipart e monta
 * `caminho_storage` no servidor, nunca com caminho vindo do client.
 */
export const documentLinkSchema = z.object({
  titulo: z.string().trim().min(1, 'Dê um nome ao documento.').max(200),
  tipo: z.enum(TIPOS_DOCUMENTO),
  fornecedorId: uuidOpcional,
  despesaId: uuidOpcional,
  urlExterna: z.string().trim().url('Informe uma URL válida.').max(2000),
})
export type DocumentLinkInput = z.infer<typeof documentLinkSchema>

/** Edição: só metadado. Trocar o arquivo é excluir e enviar outro. */
export const documentPatchSchema = z.object({
  titulo: z.string().trim().min(1).max(200).optional(),
  tipo: z.enum(TIPOS_DOCUMENTO).optional(),
  fornecedorId: uuidOpcional,
  despesaId: uuidOpcional,
})
export type DocumentPatch = z.infer<typeof documentPatchSchema>
