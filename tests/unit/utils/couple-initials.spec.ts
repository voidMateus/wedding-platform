import { describe, expect, it } from 'vitest'
import { getCoupleInitials } from '#shared/utils/couple-initials'

describe('getCoupleInitials', () => {
  it('usa a primeira letra de cada lado do "&"', () => {
    expect(getCoupleInitials('Ana & João')).toBe('AJ')
  })

  it('ignora espaços extras ao redor do "&"', () => {
    expect(getCoupleInitials('Ana   &   João')).toBe('AJ')
  })

  it('cai para as duas primeiras palavras quando não tem "&"', () => {
    expect(getCoupleInitials('Família Silva')).toBe('FS')
  })

  it('usa uma única inicial quando só há uma palavra', () => {
    expect(getCoupleInitials('Silva')).toBe('S')
  })

  it('normaliza para maiúsculas', () => {
    expect(getCoupleInitials('ana & joão')).toBe('AJ')
  })
})
