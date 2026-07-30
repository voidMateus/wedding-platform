export interface DashboardSummary {
  rsvpMode: 'per_group' | 'per_guest'
  rsvpDeadline: string | null
  totalGuests: number
  totalGroups: number
  totalInvitedUnits: number
  responsesConfirmed: number
  responsesDeclined: number
  responsesPending: number
  totalCompanionsConfirmed: number
}
