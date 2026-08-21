import { describe, expect, it } from 'vitest'
import { weddingSettingsSchema } from '#shared/schemas/wedding'

describe('weddingSettingsSchema', () => {
  it('aceita configurações válidas', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      prazoRsvp: '2026-11-01T00:00',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(true)
  })

  it('aceita horarioEvento válido (HH:MM)', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      horarioEvento: '16:00',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(true)
  })

  it('aceita horarioEvento ausente (contagem regressiva usa meia-noite como fallback)', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita horarioEvento em formato inválido', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      horarioEvento: 'às quatro da tarde',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita modoListaConvidados fora do enum', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'qualquer-coisa',
    })

    expect(result.success).toBe(false)
  })

  it('aceita handleInfinitepay opcional', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
      handleInfinitepay: 'anaejoao',
    })

    expect(result.success).toBe(true)
  })

  it('aceita ausência de handleInfinitepay (Pix desativado)', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(true)
  })

  it('modoEntregaPresenteFisico tem "ambos" como default', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.modoEntregaPresenteFisico).toBe('ambos')
    }
  })

  it('aceita modoEntregaPresenteFisico explícito', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
      modoEntregaPresenteFisico: 'somente_pagamento',
    })

    expect(result.success).toBe(true)
  })

  it('rejeita modoEntregaPresenteFisico fora do enum', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: 'Ana & João',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
      modoEntregaPresenteFisico: 'qualquer-coisa',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita nome do casal vazio', () => {
    const result = weddingSettingsSchema.safeParse({
      nomesNoivos: '  ',
      dataEvento: '2026-12-12',
      idadeMaximaCrianca: 11,
      modoListaConvidados: 'fechada',
    })

    expect(result.success).toBe(false)
  })
})
