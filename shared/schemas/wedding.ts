import { z } from 'zod'
import {
  FAIXA_ETARIA_CHAVES,
  FAIXA_ETARIA_ROTULOS,
  IDADE_MAXIMA_SUPORTADA,
} from '#shared/utils/faixa-etaria'

// Compartilhado entre client (formulário de configurações) e server
// (revalidação — CLAUDE.md, seção 8/20.1).
//
// faixasEtarias/modoListaConvidados são comportamento de negócio,
// deliberadamente fora de config_tema, que é só visual (CLAUDE.md, seção
// 16.2/22.3). A cor/fonte/foto de capa vivem em shared/schemas/theme.ts,
// endpoint próprio (PATCH /api/wedding/theme) — nunca neste schema de dados
// de negócio do evento.

// HH:MM ou HH:MM:SS — formato nativo do <input type="time">.
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/

const idadeSchema = z.coerce.number().int().min(0).max(IDADE_MAXIMA_SUPORTADA)

export const faixaEtariaSchema = z.object({
  chave: z.enum(FAIXA_ETARIA_CHAVES),
  idadeMinima: idadeSchema,
  /** null só na última faixa — "60 anos ou mais". */
  idadeMaxima: idadeSchema.nullable(),
})

/**
 * Faixas da classificação etária principal do evento (CLAUDE.md, seção 12).
 *
 * A validação abaixo é o que garante o invariante do modelo: **exatamente uma
 * faixa se aplica a cada idade**. Sem ela, "Criança 0–7 / Adolescente 5–17"
 * seria aceito e a classificação passaria a depender da ordem do array — e
 * "Criança 0–7 / Adolescente 10–17" deixaria as idades 8 e 9 sem faixa.
 *
 * O conjunto de faixas é fixo nesta versão (o catálogo de
 * `FAIXA_ETARIA_CHAVES`, que espelha o CHECK de
 * `convidados.faixa_etaria_manual`); só os limites são configuráveis. As
 * idades mínimas chegam no payload mesmo sendo deriváveis da faixa anterior:
 * é o que mantém `classificarFaixaEtaria` uma função pura do array, sem
 * pressupor continuidade — necessário para as classificações por finalidade
 * (alimentação, mesas) previstas no futuro.
 */
export const faixasEtariasSchema = z.array(faixaEtariaSchema).superRefine((faixas, ctx) => {
  if (faixas.length !== FAIXA_ETARIA_CHAVES.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Informe as ${FAIXA_ETARIA_CHAVES.length} faixas da classificação etária.`,
    })
    return
  }

  for (const [index, chaveEsperada] of FAIXA_ETARIA_CHAVES.entries()) {
    if (faixas[index]?.chave !== chaveEsperada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'chave'],
        message: `A faixa nesta posição precisa ser "${FAIXA_ETARIA_ROTULOS[chaveEsperada]}".`,
      })
      return
    }
  }

  faixas.forEach((faixa, index) => {
    const anterior = index > 0 ? faixas[index - 1] : null
    const eUltima = index === faixas.length - 1
    const rotulo = FAIXA_ETARIA_ROTULOS[faixa.chave]

    if (index === 0 && faixa.idadeMinima !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'idadeMinima'],
        message: `A primeira faixa (${rotulo}) precisa começar em 0 ano.`,
      })
    }

    // Só a última faixa é aberta no topo: sem isso a classificação teria um
    // teto e ninguém acima dele seria classificado.
    if (eUltima && faixa.idadeMaxima !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'idadeMaxima'],
        message: `A última faixa (${rotulo}) não tem idade máxima — é "${faixa.idadeMinima} anos ou mais".`,
      })
    }
    if (!eUltima && faixa.idadeMaxima === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'idadeMaxima'],
        message: `Informe até quantos anos vai a faixa ${rotulo}.`,
      })
    }

    if (faixa.idadeMaxima !== null && faixa.idadeMaxima < faixa.idadeMinima) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'idadeMaxima'],
        message: `A faixa ${rotulo} termina antes de começar — a idade final precisa ser maior ou igual a ${faixa.idadeMinima}.`,
      })
    }

    if (
      anterior &&
      anterior.idadeMaxima !== null &&
      faixa.idadeMinima !== anterior.idadeMaxima + 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'idadeMinima'],
        message: `A faixa ${rotulo} precisa começar em ${anterior.idadeMaxima + 1} anos, logo depois de ${FAIXA_ETARIA_ROTULOS[anterior.chave]} — as faixas não podem se sobrepor nem deixar idade sem classificação.`,
      })
    }
  })
})

export type FaixaEtariaInput = z.infer<typeof faixaEtariaSchema>

export const weddingSettingsSchema = z.object({
  nomesNoivos: z.string().trim().min(1, 'Informe o nome do casal.').max(200),
  dataEvento: z.string().trim().min(1, 'Informe a data do casamento.'),
  horarioEvento: z
    .string()
    .trim()
    .regex(TIME_PATTERN, 'Informe um horário válido (HH:MM).')
    .optional()
    .or(z.literal('')),
  prazoRsvp: z.string().trim().optional().or(z.literal('')),
  // Sem `.default()` de propósito: este endpoint substitui a linha inteira, e
  // um default silencioso faria uma requisição sem o campo sobrescrever a
  // configuração do casal pela padrão da plataforma.
  faixasEtarias: faixasEtariasSchema,
  modoListaConvidados: z.enum(['fechada', 'aberta']),
  // Handle público (sem "$") usado pro checkout online de presentes
  // (CLAUDE.md, seção 18/28) — vazio/ausente desativa o caminho pago. Os
  // métodos aceitos (Pix, cartão) são configurados na conta InfinitePay do
  // casal, não por este campo.
  handleInfinitepay: z.string().trim().max(100).optional().or(z.literal('')),
  // Quais formas de presentear um item físico ficam disponíveis ao convidado
  // (CLAUDE.md, seção 18) — não se aplica a Contribuições/Emocionais, que
  // sempre exigem pagamento online.
  modoEntregaPresenteFisico: z
    .enum(['ambos', 'somente_compra_propria', 'somente_pagamento'])
    .default('ambos'),
})

export type WeddingSettingsInput = z.infer<typeof weddingSettingsSchema>
