import { z } from 'zod'
import { FAIXA_ETARIA_CHAVES } from '#shared/utils/faixa-etaria'

// Compartilhado entre client (wizard de convidado) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Mesmos campos para o convidado principal e cada
// acompanhante — só o convidado principal do wizard tem convite/grupoId
// resolvidos no fluxo, os demais herdam via sincronizar_nucleo_convidado.

export const guestPersonSchema = z.object({
  id: z.string().uuid().optional(),
  nomeCompleto: z.string().trim().min(1, 'Informe o nome.').max(200),
  apelido: z.string().trim().max(100).optional().or(z.literal('')),
  sexo: z.enum(['masculino', 'feminino', 'outro']).optional().or(z.literal('')),
  // <input type="date"> envia "yyyy-mm-dd" — Postgres aceita direto.
  // Opcional de verdade: o casal raramente sabe a data de nascimento de todos
  // os convidados, e sem ela a faixa manual abaixo assume (CLAUDE.md, seção 12).
  dataNascimento: z.string().trim().optional().or(z.literal('')),
  // Faixa etária informada à mão — vale SÓ na ausência de dataNascimento;
  // com data de nascimento, a classificação é sempre calculada na data do
  // evento (shared/utils/faixa-etaria.ts#classificarFaixaEtaria).
  faixaEtariaManual: z.enum(FAIXA_ETARIA_CHAVES).optional().or(z.literal('')),
  // Canais de contato — opcionais de verdade (parte da lista chega só por
  // convite físico), mas a UI recomenda ao menos um. Guardados como digitados:
  // são dado de envio de convite, nunca chave de busca nem credencial
  // (o convidado autentica por token/sessão de RSVP — CLAUDE.md, seção 4.2).
  email: z.string().trim().max(200).email('E-mail inválido.').optional().or(z.literal('')),
  telefone: z.string().trim().max(40).optional().or(z.literal('')),
  caminhoFoto: z.string().trim().optional().or(z.literal('')),
  papelCasamento: z.enum(['padrinho', 'madrinha']).optional().or(z.literal('')),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
  grupoId: z.string().uuid().optional().or(z.literal('')),
})

export type GuestPersonInput = z.infer<typeof guestPersonSchema>

export const guestPartyInviteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, 'Informe um nome para o convite.').max(160),
  observacoes: z.string().trim().max(2000).optional().or(z.literal('')),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const guestPartySyncSchema = z.object({
  primary: guestPersonSchema,
  companions: z.array(guestPersonSchema).default([]),
  removedGuestIds: z.array(z.string().uuid()).default([]),
  invite: guestPartyInviteSchema.optional(),
  /**
   * Posição do convidado deste cadastro DENTRO do núcleo — um índice na fila
   * de `companions`, não uma hierarquia.
   *
   * Existe porque o núcleo é simétrico e a ordem dele não podia depender de
   * quem foi aberto por último. `ordem_nucleo = 0` era atribuído ao editado,
   * então salvar o cadastro da Maria trocava o rótulo derivado de "João e
   * Maria" para "Maria e João" na lista inteira, sem ninguém ter pedido.
   *
   * Zero continua sendo o default: quem cadastra uma pessoa e adiciona
   * acompanhantes espera aparecer primeiro, e é o que acontece sem informar
   * nada.
   */
  primaryPosition: z.number().int().min(0).default(0),
})

export type GuestPartySyncInput = z.infer<typeof guestPartySyncSchema>

/**
 * Entrada rápida do Modo Lista: o casal digita um nome e aperta Enter.
 *
 * Deliberadamente separado de `guestPartySyncSchema`: aquele descreve o wizard
 * inteiro (principal + acompanhantes + convite) e exige um objeto grande para
 * criar uma pessoa. Aqui o ponto é justamente não ter formulário — nome é o
 * único campo obrigatório, e todo o resto do cadastro é preenchido depois, na
 * própria lista ou no wizard.
 *
 * `grupoId` aponta para a folha onde a pessoa entra, que pode ser um grupo ou
 * uma subdivisão (`grupos.grupo_pai_id`) — o convidado nunca guarda as duas
 * coisas. Que o grupo pertença a este casamento é garantido por trigger no
 * Postgres (migration 20260821090003), não por checagem aqui.
 */
export const guestQuickCreateSchema = z.object({
  nomeCompleto: z.string().trim().min(1, 'Informe o nome.').max(200),
  grupoId: z.string().uuid().nullish(),
  /**
   * Nasce no rascunho da lista ("Em consideração") em vez de na lista de
   * convidados. Rascunho nunca tem convite — a constraint
   * `convidados_em_consideracao_sem_convite` garante isso no banco.
   */
  emConsideracao: z.boolean().default(false),
})

export type GuestQuickCreateInput = z.infer<typeof guestQuickCreateSchema>

/**
 * Ação em massa da lista: aplica o MESMO valor a vários convidados.
 *
 * Só os campos que a tela oferece em lote, e nenhum a mais. Grupo e faixa
 * manual são update simples; convite e núcleo ficam de fora de propósito —
 * os dois exigem orquestração transacional (`sincronizar_nucleo_convidado`),
 * e um "update em lote" que atravessasse isso quebraria a garantia de que
 * ninguém entra em dois convites.
 *
 * `undefined` significa "não mexer"; `null` em `grupoId` desvincula do grupo.
 * A distinção existe porque tirar todo mundo de um grupo é uma ação real, e
 * sem `null` explícito ela não teria representação.
 */
export const guestBulkUpdateSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um convidado.').max(500),
    grupoId: z.string().uuid().nullish(),
    faixaEtariaManual: z.enum(FAIXA_ETARIA_CHAVES).nullish(),
  })
  .refine(
    (input) => input.grupoId !== undefined || input.faixaEtariaManual !== undefined,
    'Informe o que alterar.',
  )

export type GuestBulkUpdateInput = z.infer<typeof guestBulkUpdateSchema>

/**
 * Agrupar os selecionados da lista como Acompanhantes.
 *
 * Só os ids: tudo o que decide o resultado — qual núcleo sobrevive ao merge,
 * qual ordem, qual convite — é estado que já está no banco, e reenviá-lo do
 * client seria dar ao navegador a chance de discordar dele.
 *
 * Dois é o mínimo real, não um limite arbitrário: um núcleo de uma pessoa não
 * agrupa nada e é justamente o estado que o banco passou a dissolver.
 */
export const guestPartyGroupSchema = z.object({
  ids: z.array(z.string().uuid()).min(2, 'Selecione ao menos duas pessoas.').max(50),
})

export type GuestPartyGroupInput = z.infer<typeof guestPartyGroupSchema>
