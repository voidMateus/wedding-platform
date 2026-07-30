import { describe, expect, it } from 'vitest'
import { generateAccessCode, hashAccessCode } from '../../../server/utils/guest-access-token'

describe('generateAccessCode', () => {
  it('gera um código com pelo menos 22 caracteres (CLAUDE.md, seção 14.5)', () => {
    expect(generateAccessCode().length).toBeGreaterThanOrEqual(22)
  })

  it('gera apenas caracteres base62', () => {
    expect(generateAccessCode()).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('gera códigos diferentes a cada chamada', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateAccessCode()))
    expect(codes.size).toBe(50)
  })
})

describe('hashAccessCode', () => {
  it('produz um hash SHA-256 (64 caracteres hex) e determinístico', () => {
    const hash = hashAccessCode('um-codigo-qualquer')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashAccessCode('um-codigo-qualquer')).toBe(hash)
  })

  it('nunca retorna o código em texto plano', () => {
    const code = generateAccessCode()
    expect(hashAccessCode(code)).not.toContain(code)
  })

  it('códigos diferentes produzem hashes diferentes', () => {
    expect(hashAccessCode('codigo-a')).not.toBe(hashAccessCode('codigo-b'))
  })
})
