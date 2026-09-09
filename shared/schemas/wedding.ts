import { z } from 'zod'
import {
  FAIXA_ETARIA_CHAVES,
  MIN_FAIXAS_ETARIAS_ATIVAS,
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
 * O evento **escolhe quais** faixas do catálogo usa (`FAIXA_ETARIA_CHAVES`,
 * que espelha o CHECK de `convidados.faixa_etaria_manual`) e os limites de
 * cada uma. Nem toda festa separa em quatro: muitas querem só duas, "criança"
 * e "adulto". O array é a própria lista de faixas ativas — faixa desligada é
 * faixa ausente, sem campo `ativa` a mais.
 *
 * O que NÃO é negociável é a cobertura: as faixas presentes têm que cobrir de
 * 0 a ∞ sem vão e sem sobreposição. É por isso que "desligar" não pode ser só
 * remover do array — alguém tem que herdar o território, senão um convidado de
 * 14 anos deixa de casar com qualquer faixa e vira "não informada" em silêncio,
 * na lista inteira. As validações de continuidade abaixo são o que garante isso
 * independentemente de quantas faixas sobraram.
 *
 * As idades mínimas chegam no payload mesmo sendo deriváveis da faixa anterior:
 * é o que mantém `classificarFaixaEtaria` uma função pura do array, sem
 * pressupor continuidade — necessário para as classificações por finalidade
 * (alimentação, mesas) previstas no futuro.
 */
export const faixasEtariasSchema = z.array(faixaEtariaSchema).superRefine((faixas, ctx) => {
  if (faixas.length < MIN_FAIXAS_ETARIAS_ATIVAS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A classificação precisa de pelo menos ${MIN_FAIXAS_ETARIAS_ATIVAS} faixas.`,
    })
    return
  }

  // Subsequência da ordem do catálogo: as faixas que sobraram podem ser
  // quaisquer, mas nunca repetidas nem fora de ordem — a continuidade abaixo é
  // verificada de vizinha em vizinha, e fora de ordem ela validaria um array
  // que classifica pela posição, não pela idade.
  let posicaoAnterior = -1
  for (const [index, faixa] of faixas.entries()) {
    const posicao = FAIXA_ETARIA_CHAVES.indexOf(faixa.chave)
    if (posicao <= posicaoAnterior) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'chave'],
        message: `A faixa "${FAIXA_ETARIA_ROTULOS[faixa.chave]}" está repetida ou fora da ordem de idade.`,
      })
      return
    }
    posicaoAnterior = posicao
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
