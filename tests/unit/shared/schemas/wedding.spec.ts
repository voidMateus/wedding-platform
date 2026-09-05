import { describe, expect, it } from 'vitest'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { FAIXAS_ETARIAS_PADRAO } from '#shared/utils/faixa-etaria'

/** Campos obrigatórios do formulário — cada teste sobrescreve só o que investiga. */
function base(overrides: Record<string, unknown> = {}) {
  return {
    nomesNoivos: 'Ana & João',
    dataEvento: '2026-12-12',
    faixasEtarias: FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
    modoListaConvidados: 'fechada',
    ...overrides,
  }
}

describe('weddingSettingsSchema', () => {
  it('aceita configurações válidas', () => {
    const result = weddingSettingsSchema.safeParse(base({ prazoRsvp: '2026-11-01T00:00' }))

    expect(result.success).toBe(true)
  })

  it('aceita horarioEvento válido (HH:MM)', () => {
    const result = weddingSettingsSchema.safeParse(base({ horarioEvento: '16:00' }))

    expect(result.success).toBe(true)
  })

  it('aceita horarioEvento ausente (contagem regressiva usa meia-noite como fallback)', () => {
    const result = weddingSettingsSchema.safeParse(base())

    expect(result.success).toBe(true)
  })

  it('rejeita horarioEvento em formato inválido', () => {
    const result = weddingSettingsSchema.safeParse(base({ horarioEvento: 'às quatro da tarde' }))

    expect(result.success).toBe(false)
  })

  it('rejeita modoListaConvidados fora do enum', () => {
    const result = weddingSettingsSchema.safeParse(base({ modoListaConvidados: 'qualquer-coisa' }))

    expect(result.success).toBe(false)
  })

  it('aceita handleInfinitepay opcional', () => {
    const result = weddingSettingsSchema.safeParse(base({ handleInfinitepay: 'anaejoao' }))

    expect(result.success).toBe(true)
  })

  it('aceita ausência de handleInfinitepay (Pix desativado)', () => {
    const result = weddingSettingsSchema.safeParse(base())

    expect(result.success).toBe(true)
  })

  it('modoEntregaPresenteFisico tem "ambos" como default', () => {
    const result = weddingSettingsSchema.safeParse(base())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.modoEntregaPresenteFisico).toBe('ambos')
    }
  })

  it('aceita modoEntregaPresenteFisico explícito', () => {
    const result = weddingSettingsSchema.safeParse(
      base({ modoEntregaPresenteFisico: 'somente_pagamento' }),
    )

    expect(result.success).toBe(true)
  })

  it('rejeita modoEntregaPresenteFisico fora do enum', () => {
    const result = weddingSettingsSchema.safeParse(
      base({ modoEntregaPresenteFisico: 'qualquer-coisa' }),
    )

    expect(result.success).toBe(false)
  })

  it('rejeita nome do casal vazio', () => {
    const result = weddingSettingsSchema.safeParse(base({ nomesNoivos: '  ' }))

    expect(result.success).toBe(false)
  })
})

/**
 * A validação das faixas é o que garante o invariante do modelo: exatamente
 * uma classificação se aplica a cada idade (CLAUDE.md, seção 12). Sem ela, a
 * faixa de um convidado passaria a depender da ordem do array.
 */
describe('weddingSettingsSchema — faixasEtarias', () => {
  function comFaixas(faixas: Array<Record<string, unknown>>) {
    return weddingSettingsSchema.safeParse(base({ faixasEtarias: faixas }))
  }

  it('aceita limites personalizados (criança até 7, adolescente até 17)', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 7 },
      { chave: 'adolescente', idadeMinima: 8, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(true)
  })

  it('rejeita faixas sobrepostas (criança 0–7 e adolescente 5–17)', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 7 },
      { chave: 'adolescente', idadeMinima: 5, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita buraco entre faixas (criança 0–7 e adolescente 10–17 deixa 8 e 9 sem faixa)', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 7 },
      { chave: 'adolescente', idadeMinima: 10, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita faixa que termina antes de começar', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 11 },
      { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 10 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita primeira faixa que não começa em 0', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 1, idadeMaxima: 11 },
      { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita última faixa com teto — ninguém acima dele seria classificado', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 11 },
      { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: 120 },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita faixa intermediária sem idade final', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: null },
      { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita conjunto incompleto de faixas', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita faixas fora da ordem do catálogo', () => {
    const result = comFaixas([
      { chave: 'adolescente', idadeMinima: 0, idadeMaxima: 11 },
      { chave: 'crianca', idadeMinima: 12, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 59 },
      { chave: 'idoso', idadeMinima: 60, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('rejeita idade acima do limite suportado', () => {
    const result = comFaixas([
      { chave: 'crianca', idadeMinima: 0, idadeMaxima: 11 },
      { chave: 'adolescente', idadeMinima: 12, idadeMaxima: 17 },
      { chave: 'adulto', idadeMinima: 18, idadeMaxima: 999 },
      { chave: 'idoso', idadeMinima: 1000, idadeMaxima: null },
    ])

    expect(result.success).toBe(false)
  })

  it('exige o campo — uma requisição sem ele não pode zerar a configuração do casal', () => {
    const { faixasEtarias: _omitido, ...semFaixas } = base()
    const result = weddingSettingsSchema.safeParse(semFaixas)

    expect(result.success).toBe(false)
  })
})
