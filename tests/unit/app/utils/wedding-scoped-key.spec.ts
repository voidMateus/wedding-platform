import { describe, expect, it } from 'vitest'
import { weddingScopedKey } from '~/utils/wedding-scoped-key'

describe('weddingScopedKey', () => {
  it('separa a mesma base entre casamentos diferentes', () => {
    expect(weddingScopedKey('dashboard-summary', 'ana-e-bruno')).not.toBe(
      weddingScopedKey('dashboard-summary', 'carla-e-diego'),
    )
  })

  it('mantém a mesma chave para a mesma base no mesmo casamento', () => {
    // É o que faz duas telas compartilharem cache — marcar uma parcela como
    // paga no Orçamento atualiza o resumo da Visão geral sem refetch duplo.
    expect(weddingScopedKey('finance-summary', 'ana-e-bruno')).toBe(
      weddingScopedKey('finance-summary', 'ana-e-bruno'),
    )
  })

  it('separa bases diferentes dentro do mesmo casamento', () => {
    expect(weddingScopedKey('gifts', 'ana-e-bruno')).not.toBe(
      weddingScopedKey('guest-overview', 'ana-e-bruno'),
    )
  })

  it('carrega o slug mesmo quando ele está vazio', () => {
    // Fora de /admin/{slug}/** não há casamento ativo, e a chave precisa
    // continuar sendo distinta da de um casamento real — uma regra que às
    // vezes vale é uma regra que alguém precisa lembrar de aplicar.
    expect(weddingScopedKey('wedding', '')).not.toBe(weddingScopedKey('wedding', 'ana-e-bruno'))
  })
})
