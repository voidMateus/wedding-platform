import type { FaixaEtariaFiltro } from '#shared/utils/faixa-etaria'

export interface DashboardSummary {
  rsvpDeadline: string | null
  invites: {
    total: number
    sent: number
    responded: number
    partial: number
    pending: number
    archived: number
  }
  people: {
    total: number
    confirmed: number
    declined: number
    pending: number
    waitlisted: number
    /**
     * Pessoas por faixa etária do evento — derivado a cada requisição da
     * idade na data do casamento contra `config_faixas_etarias`, nunca lido
     * de uma coluna (CLAUDE.md, seção 12).
     */
    byAgeGroup: Record<FaixaEtariaFiltro, number>
    padrinhos: number
    madrinhas: number
  }
  rsvp: {
    firstResponseAt: string | null
    lastResponseAt: string | null
    respondedToday: number
    respondedThisWeek: number
    responseRatePercent: number
    avgHoursToRespond: number | null
    viewedNotResponded: number
  }
}
