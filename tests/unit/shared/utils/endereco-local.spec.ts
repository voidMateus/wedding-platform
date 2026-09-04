import { describe, expect, it } from 'vitest'
import { formatarEnderecoLocal } from '#shared/utils/endereco-local'

describe('formatarEnderecoLocal', () => {
  it('compõe rua, número, complemento, cidade e estado', () => {
    expect(
      formatarEnderecoLocal({
        logradouro: 'Av. Miguel Sutil',
        numero: '1234',
        complemento: 'Bloco B',
        cidade: 'Cuiabá',
        estado: 'MT',
      }),
    ).toBe('Av. Miguel Sutil, 1234 · Bloco B · Cuiabá - MT')
  })

  it('endereço rural sem número não vira "Estrada, "', () => {
    expect(
      formatarEnderecoLocal({
        logradouro: 'Estrada da Guarita, km 8',
        cidade: 'Chapada dos Guimarães',
        estado: 'MT',
      }),
    ).toBe('Estrada da Guarita, km 8 · Chapada dos Guimarães - MT')
  })

  it('cidade sem UF não vira "Cuiabá - "', () => {
    expect(formatarEnderecoLocal({ cidade: 'Cuiabá' })).toBe('Cuiabá')
  })

  it('número sem logradouro não vira ", 100"', () => {
    expect(formatarEnderecoLocal({ numero: '100' })).toBe('100')
  })

  it('espaços em branco não contam como parte preenchida', () => {
    expect(formatarEnderecoLocal({ logradouro: '   ', cidade: 'Cuiabá', estado: '  ' })).toBe(
      'Cuiabá',
    )
  })

  it('nenhuma parte preenchida devolve string vazia', () => {
    expect(formatarEnderecoLocal({})).toBe('')
    expect(formatarEnderecoLocal({ logradouro: null, cidade: undefined })).toBe('')
  })
})
