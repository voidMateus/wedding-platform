import { describe, expect, it } from 'vitest'
import { proximoEnderecoLivre, sugerirEnderecoDoSite } from '#shared/utils/endereco-do-site'
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

describe('proximoEnderecoLivre', () => {
  it('devolve a própria base quando ela está livre', () => {
    expect(proximoEnderecoLivre('ana-e-joao', [])).toBe('ana-e-joao')
    expect(proximoEnderecoLivre('ana-e-joao', ['outro-casal'])).toBe('ana-e-joao')
  })

  it('numera a partir do 2, e pula os que já existem', () => {
    expect(proximoEnderecoLivre('ana-e-joao', ['ana-e-joao'])).toBe('ana-e-joao-2')
    expect(proximoEnderecoLivre('ana-e-joao', ['ana-e-joao', 'ana-e-joao-2'])).toBe('ana-e-joao-3')
  })

  it('encurta a base para o sufixo caber no limite do campo', () => {
    const base = 'a'.repeat(60)
    const livre = proximoEnderecoLivre(base, [base])

    expect(livre).toBe(`${'a'.repeat(58)}-2`)
    expect(livre).toHaveLength(60)
    expect(platformWeddingCreateSchema.shape.slug.safeParse(livre).success).toBe(true)
  })

  it('não deixa hífen solto quando encurta', () => {
    // A fatia cairia bem no meio do último hífen: `...-` + `-2` seria `--2`,
    // que o formato recusa.
    const base = `${'a'.repeat(57)}-bb`
    const livre = proximoEnderecoLivre(base, [base])

    expect(livre).toBe(`${'a'.repeat(57)}-2`)
    expect(platformWeddingCreateSchema.shape.slug.safeParse(livre).success).toBe(true)
  })

  it('desiste em vez de devolver algo inválido', () => {
    const tomados = ['ana-e-joao', ...Array.from({ length: 98 }, (_, i) => `ana-e-joao-${i + 2}`)]
    expect(proximoEnderecoLivre('ana-e-joao', tomados)).toBeNull()
  })

  it('numera até uma base que sozinha seria curta demais', () => {
    // `jo` não passa no mínimo de 3 do schema, mas `jo-2` passa — e quem digitou
    // `jo` à mão merece a mesma oferta de alternativa que os outros.
    expect(proximoEnderecoLivre('jo', ['jo'])).toBe('jo-2')
  })

  /** O contrato que sustenta os dois: o que se oferece, o campo aceita. */
  it.each([
    ['ana-e-joao', ['ana-e-joao']],
    ['jo', ['jo']],
    ['ana-e-joao', ['ana-e-joao', 'ana-e-joao-2', 'ana-e-joao-3']],
  ] as const)('a alternativa para "%s" passa no schema de criação', (base, tomados) => {
    const livre = proximoEnderecoLivre(base, tomados)
    if (livre === null) return
    expect(platformWeddingCreateSchema.shape.slug.safeParse(livre).success).toBe(true)
  })
})
