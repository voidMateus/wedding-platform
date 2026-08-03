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
    children: number
    adults: number
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
