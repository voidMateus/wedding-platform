import { describe, expect, it } from 'vitest'
import { normalizarEmail, temEmail } from '#shared/utils/email'

describe('normalizarEmail', () => {
  it('aceita o endereço comum', () => {
    expect(normalizarEmail('ana@exemplo.com.br')).toBe('ana@exemplo.com.br')
  })

  it('tira o espaço que sobra da colagem', () => {
    expect(normalizarEmail('  ana@exemplo.com  ')).toBe('ana@exemplo.com')
  })

  it('abaixa a caixa do domínio e preserva a da parte local', () => {
    // O RFC permite que a parte local seja sensível a caixa; reescrevê-la é
    // passar por cima de um dado que não é nosso.
    expect(normalizarEmail('Ana.Silva@Exemplo.COM.BR')).toBe('Ana.Silva@exemplo.com.br')
  })

  it('aceita subdomínio e sinal de mais', () => {
    expect(normalizarEmail('ana+casamento@mail.exemplo.com')).toBe('ana+casamento@mail.exemplo.com')
  })

  it.each([
    ['vazio', ''],
    ['nulo', null],
    ['indefinido', undefined],
    ['o que o casal escreveu no lugar do e-mail', 'não tem'],
    ['sem arroba', 'ana.exemplo.com'],
    ['sem domínio', 'ana@'],
    ['sem tld', 'ana@exemplo'],
    ['com espaço no meio', 'ana silva@exemplo.com'],
    ['dois endereços colados', 'ana@exemplo.com, joao@exemplo.com'],
    ['só a arroba', '@'],
  ])('recusa %s', (_caso, entrada) => {
    expect(normalizarEmail(entrada)).toBeNull()
  })

  it('temEmail responde a pergunta da tela', () => {
    expect(temEmail('ana@exemplo.com')).toBe(true)
    expect(temEmail('não tem')).toBe(false)
  })
})
