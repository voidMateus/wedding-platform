import { describe, expect, it } from 'vitest'
import { sugerirEnderecoDoSite } from '#shared/utils/endereco-do-site'
import { platformWeddingCreateSchema } from '#shared/schemas/platform-wedding'

describe('sugerirEnderecoDoSite', () => {
  it('usa só o primeiro nome de cada lado', () => {
    expect(sugerirEnderecoDoSite('Lucas Almeida e Maria Almeida')).toBe('lucas-e-maria')
  })

  it('aceita os três conectores que o casal escreve', () => {
    expect(sugerirEnderecoDoSite('Ana e Bruno')).toBe('ana-e-bruno')
    expect(sugerirEnderecoDoSite('Ana & Bruno')).toBe('ana-e-bruno')
    expect(sugerirEnderecoDoSite('Ana + Bruno')).toBe('ana-e-bruno')
  })

  it('tira acento e caixa', () => {
    expect(sugerirEnderecoDoSite('José & Mônica')).toBe('jose-e-monica')
  })

  it('não se confunde com o "e" dentro de um nome composto', () => {
    expect(sugerirEnderecoDoSite('Maria de Fátima e João')).toBe('maria-e-joao')
  })

  it('devolve um lado só quando não há conector', () => {
    expect(sugerirEnderecoDoSite('Ana')).toBe('ana')
  })

  it('devolve vazio quando não há nome nenhum', () => {
    expect(sugerirEnderecoDoSite('')).toBe('')
    expect(sugerirEnderecoDoSite('   ')).toBe('')
  })

  it('devolve vazio quando a sugestão não caberia no campo', () => {
    // Curto demais para o mínimo de 3 do schema.
    expect(sugerirEnderecoDoSite('Jô')).toBe('')
  })

  /**
   * A garantia que importa: o que a função sugere, o formulário aceita. Sem
   * isto, um campo poderia nascer preenchido e inválido — que é pior do que
   * nascer vazio.
   */
  it.each([
    'Lucas Almeida e Maria Almeida',
    'José & Mônica',
    'Ana',
    'Ana Clara Ribeiro e Pedro Henrique Souza',
  ])('a sugestão de "%s" passa no schema de criação', (nomes) => {
    const sugestao = sugerirEnderecoDoSite(nomes)
    expect(sugestao).not.toBe('')
    expect(platformWeddingCreateSchema.shape.slug.safeParse(sugestao).success).toBe(true)
  })
})
