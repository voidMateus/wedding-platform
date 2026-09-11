import {
  ROTULOS_ESTAGIO_FORNECEDOR,
  type EstagioFornecedor,
  type TipoDocumento,
  ROTULOS_TIPO_DOCUMENTO,
} from '#shared/schemas/finance'
import type { SituacaoFinanceiraFornecedor, SituacaoPagamento } from '#shared/utils/orcamento'
import type { StatusPresentation, StatusTone } from './status-presentation'

/**
 * Rótulo + tom dos estados do Financeiro, seguindo o mesmo mapa da
 * plataforma (`status-presentation.ts`):
 *
 * success = resolvido · warning = pendente COM ação esperada ·
 * danger = falha real · neutral = fato sem valência · primary = identidade.
 *
 * "A vencer" é neutral, não warning: parcela futura não pede providência
 * hoje. Vencida é danger — é a única coisa aqui que já deu errado.
 */

const SITUACAO_PARCELA: Record<SituacaoPagamento, StatusPresentation> = {
  paga: { label: 'Pago', tone: 'success' },
  a_vencer: { label: 'A vencer', tone: 'neutral' },
  vencida: { label: 'Vencido', tone: 'danger' },
  // `warning` porque há providência esperada, e ela não é pagar: é decidir
  // quando pagar. Sem data, esse valor não aparece em nenhum vencimento.
  a_definir: { label: 'Sem data', tone: 'warning' },
}

export function situacaoParcelaPresentation(situacao: SituacaoPagamento): StatusPresentation {
  return SITUACAO_PARCELA[situacao]
}

const SITUACAO_FORNECEDOR: Record<SituacaoFinanceiraFornecedor, StatusPresentation> = {
  sem_despesa: { label: 'Sem despesa', tone: 'neutral' },
  a_pagar: { label: 'A pagar', tone: 'warning' },
  quitado: { label: 'Quitado', tone: 'success' },
}

export function situacaoFornecedorPresentation(
  situacao: SituacaoFinanceiraFornecedor,
): StatusPresentation {
  return SITUACAO_FORNECEDOR[situacao]
}

/**
 * A situação do fornecedor é uma progressão, e o selo precisa deixar claro em
 * que ponto dela ele está: pesquisar é fato sem valência, negociar é pendência
 * com providência esperada, e fechar é o desfecho positivo daquela conversa.
 *
 * "Contratado" era `primary` — a única variante sem preenchimento, que numa
 * coluna de estados lia como botão, e não como selo.
 */
const ESTAGIO_TONES: Record<EstagioFornecedor, StatusTone> = {
  pesquisando: 'neutral',
  // "Contato feito" é fato sem valência: a bola está com o fornecedor, e não
  // há providência do casal esperando. Já "cotação recebida" e "em negociação"
  // são pendências dele — é aí que alguém precisa decidir.
  contato_feito: 'neutral',
  cotacao_recebida: 'warning',
  em_negociacao: 'warning',
  contratado: 'success',
  descartado: 'neutral',
}

export function estagioFornecedorPresentation(estagio: EstagioFornecedor): StatusPresentation {
  return { label: ROTULOS_ESTAGIO_FORNECEDOR[estagio], tone: ESTAGIO_TONES[estagio] }
}

export function tipoDocumentoLabel(tipo: TipoDocumento): string {
  return ROTULOS_TIPO_DOCUMENTO[tipo]
}

/** "12 de out." — data curta para linha de parcela, sem o ano quando é o corrente. */
export function formatarVencimento(data: string, hoje: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const referencia = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1))
  const mesmoAno = data.slice(0, 4) === hoje.slice(0, 4)

  return referencia.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: mesmoAno ? undefined : 'numeric',
    timeZone: 'UTC',
  })
}
