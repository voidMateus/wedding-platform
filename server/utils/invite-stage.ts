import type { InviteStage } from '~/types/invite'

/**
 * Tradução do estágio do funil entre o vocabulário do banco e o do DTO.
 *
 * A view devolve em português, porque é coluna de banco; o DTO da listagem é
 * inglês desde sempre — campo computado de exibição, não espelho de uma linha
 * de tabela (CLAUDE.md, seção 6).
 *
 * Vive aqui porque os DOIS endpoints de convite precisam dela — a listagem e o
 * detalhe. E o detalhe precisava de mais que a tradução: ele recalculava o
 * status consolidado em TypeScript (`computeResponseStatus`), uma segunda
 * implementação da regra que a view já decide. Duas implementações da mesma
 * regra divergem no primeiro ajuste de uma delas, e com o funil a divergência
 * seria imediata: a versão em TS não sabia nada sobre "aberto".
 */
const DO_BANCO: Record<string, InviteStage> = {
  nao_enviado: 'not_sent',
  enviado: 'sent',
  aberto: 'opened',
  parcial: 'partial',
  respondido: 'responded',
}

const PARA_O_BANCO: Record<InviteStage, string> = {
  not_sent: 'nao_enviado',
  sent: 'enviado',
  opened: 'aberto',
  partial: 'parcial',
  responded: 'respondido',
}

/** `nao_enviado` como piso: é o primeiro estágio, e nenhum fato é exigido para estar nele. */
export function inviteStageFromView(valor: string | null | undefined): InviteStage {
  return DO_BANCO[valor ?? 'nao_enviado'] ?? 'not_sent'
}

export function inviteStageToView(stage: InviteStage): string {
  return PARA_O_BANCO[stage]
}
