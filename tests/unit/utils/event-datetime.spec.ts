import { describe, expect, it } from 'vitest'
import { resolveEventDateTime } from '#shared/utils/event-datetime'

describe('resolveEventDateTime', () => {
  it('usa a hora informada quando presente (HH:MM)', () => {
    const result = resolveEventDateTime('2026-12-12', '16:00')
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(12)
    expect(result.getHours()).toBe(16)
    expect(result.getMinutes()).toBe(0)
  })

  it('aceita hora no formato HH:MM:SS (retornado pelo Postgres)', () => {
    const result = resolveEventDateTime('2026-12-12', '16:30:00')
    expect(result.getHours()).toBe(16)
    expect(result.getMinutes()).toBe(30)
  })

  it('usa meia-noite como fallback quando não há horário', () => {
    const result = resolveEventDateTime('2026-12-12', null)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})
