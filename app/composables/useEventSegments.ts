import type { EventSegmentInput } from '#shared/schemas/event-segments'
import type { EventSegment } from '~/types/event-segment'

interface EventSegmentListResponse {
  data: EventSegment[]
}

/**
 * CRUD do cronograma (CLAUDE.md, seção 19.2 — "Cronograma"). Toda chamada de
 * rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useEventSegments() {
  function listEventSegments() {
    return useFetch<EventSegmentListResponse>('/api/event-segments', { key: 'event-segments' })
  }

  async function createEventSegment(input: EventSegmentInput): Promise<EventSegment> {
    return $fetch<EventSegment>('/api/event-segments', { method: 'POST', body: input })
  }

  async function updateEventSegment(id: string, input: EventSegmentInput): Promise<EventSegment> {
    return $fetch<EventSegment>(`/api/event-segments/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteEventSegment(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/event-segments/${id}`, { method: 'DELETE' })
  }

  return { listEventSegments, createEventSegment, updateEventSegment, deleteEventSegment }
}
