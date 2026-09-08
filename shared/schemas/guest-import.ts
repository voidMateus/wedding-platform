import { z } from 'zod'
import { FAIXA_ETARIA_CHAVES } from '#shared/utils/faixa-etaria'

/**
 * Contrato da importação em massa de convidados.
 *
 * O client parseia e normaliza a planilha (o arquivo nunca sobe cru), mas o
 * servidor revalida tudo aqui — client nunca é fonte de verdade (CLAUDE.md,
 * seção 4.1).
 *
 * **Todo campo é opcional de propósito, e a ausência significa "não mexer".**
 * Uma planilha de atualização quase nunca traz todas as colunas: uma com
 * `id;nome_completo;grupo` não pode zerar o e-mail de duzentas pessoas. É a
 * mesma semântica que `sincronizar_nucleo_convidado` já aplica ao contato
 * (migration 20260904170001) — aqui ela vale para todos os campos. Limpar de
 * propósito continua possível: a coluna vai presente com a célula vazia.
 */

/**
 * Teto por requisição. Existe por dois motivos concretos: um corpo grande
 * demais estoura o limite da função serverless, e uma transação longa segura
 * bloqueios em `grupos`/`convites` por tempo demais. Acima disso o client
 * fatia em lotes sequenciais e mostra progresso.
 */
export const MAX_LINHAS_IMPORTACAO = 500

const textoOpcional = (max: number) => z.string().trim().max(max).optional()

export const guestImportRowSchema = z
  .object({
    /**
     * Preenchido = atualiza esse convidado; ausente = cria um novo. É o que
     * torna "exportar → editar no Excel → reimportar" um caminho real, sem
     * heurística de nome para achar duplicata.
     */
    id: z.string().uuid('Identificador inválido.').optional(),
    nome_completo: z.string().trim().min(1, 'Informe o nome.').max(200).optional(),
    apelido: textoOpcional(100),
    sexo: z.enum(['masculino', 'feminino', 'outro']).optional(),
    /** Já normalizada para "AAAA-MM-DD" pelo preparo — o formato digitado varia. */
    data_nascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
      .optional(),
    faixa_etaria_manual: z.enum(FAIXA_ETARIA_CHAVES).optional(),
    email: z.string().trim().max(200).email('E-mail inválido.').optional().or(z.literal('')),
    telefone: textoOpcional(40),
    papel_casamento: z.enum(['padrinho', 'madrinha']).optional(),
    observacoes: textoOpcional(2000),
    /** Nome do grupo, não o uuid — resolvido/criado no servidor. */
    grupo: textoOpcional(120),
    /** Nome do convite, não o uuid — resolvido/criado no servidor. */
    convite: textoOpcional(160),
  })
  .superRefine((linha, ctx) => {
    // Sem `id`, a linha cria alguém — e ninguém é cadastrado sem nome. Com
    // `id`, o nome pode faltar: a linha só atualiza as colunas que trouxe, e o
    // nome que já está no banco continua valendo.
    if (!linha.id && !linha.nome_completo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nome_completo'],
        message: 'Informe o nome para cadastrar um convidado novo.',
      })
    }
  })

export type GuestImportRow = z.infer<typeof guestImportRowSchema>

export const guestImportSchema = z.object({
  linhas: z
    .array(guestImportRowSchema)
    .min(1, 'Nenhuma linha para importar.')
    .max(MAX_LINHAS_IMPORTACAO, `Máximo de ${MAX_LINHAS_IMPORTACAO} linhas por lote.`),
  /**
   * Confirmação explícita de que o casal viu quantos grupos/convites novos
   * seriam criados. Sem isso, uma coluna com erro de digitação ("Familia da
   * Noiva" em 3 linhas) criaria entidades silenciosamente.
   */
  criarVinculosNovos: z.boolean().default(false),
})

export type GuestImportInput = z.infer<typeof guestImportSchema>

export interface GuestImportResult {
  criados: number
  atualizados: number
  gruposCriados: string[]
  convitesCriados: string[]
}
