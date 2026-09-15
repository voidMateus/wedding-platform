import { describe, expect, it } from 'vitest'
import { formatarBytes } from '#shared/utils/bytes'

describe('formatarBytes', () => {
  it('mostra bytes e KB sem casa decimal', () => {
    expect(formatarBytes(512)).toBe('512 B')
    expect(formatarBytes(2048)).toBe('2 KB')
  })

  it('ganha uma casa a partir de MB', () => {
    expect(formatarBytes(13_000_000)).toBe('12,4 MB')
    expect(formatarBytes(1_965_432_100)).toBe('1,8 GB')
  })

  it('usa vírgula decimal, como todo número da plataforma', () => {
    expect(formatarBytes(13_000_000)).toContain(',')
    expect(formatarBytes(13_000_000)).not.toContain('.')
  })

  it('sobe de unidade exatamente em 1024', () => {
    expect(formatarBytes(1023)).toBe('1023 B')
    expect(formatarBytes(1024)).toBe('1 KB')
  })

  it('casamento sem arquivo nenhum lê "0 B", nunca vazio', () => {
    // Zero é estado normal: casamento recém-criado não tem capa nem documento.
    expect(formatarBytes(0)).toBe('0 B')
    expect(formatarBytes(-1)).toBe('0 B')
    expect(formatarBytes(Number.NaN)).toBe('0 B')
  })
})
