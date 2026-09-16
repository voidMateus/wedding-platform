/**
 * Acesso de suporte da equipe interna ao painel de um casamento
 * (docs/fase5-multievento.md 6.7).
 *
 * O vínculo é uma linha REAL em `membros_casamento`, com
 * `acesso_suporte_expira_em` preenchido. É o que permite a equipe usar o painel
 * sem que nada mude nas 123 rotas que resolvem autorização por RLS — a
 * alternativa seria acrescentar o operador às ~90 policies, que o CLAUDE.md
 * (seção 4.2) proíbe justamente porque um tenant poderia herdá-la por engano.
 */

/**
 * Quanto dura uma sessão de suporte.
 *
 * Suporte a casal é uma sessão de trabalho, não uma relação contínua — e
 * esquecer de encerrar não pode virar acesso permanente. Quatro horas cobrem
 * um atendimento inteiro com folga.
 */
export const HORAS_DE_ACESSO_DE_SUPORTE = 4

export function validadeDoAcessoDeSuporte(agora = new Date()): string {
  return new Date(agora.getTime() + HORAS_DE_ACESSO_DE_SUPORTE * 60 * 60 * 1000).toISOString()
}

/**
 * O acesso é silencioso na TELA do casal por decisão de produto (2026-09-15) —
 * `GET /api/wedding/members` filtra o vínculo, e ele não entra na contagem de
 * donos. Nunca é silencioso na trilha de auditoria: conceder e encerrar ficam
 * registrados, e o casal lê a própria trilha. Ocultar o registro também
 * removeria a accountability que torna a expiração verificável.
 */
