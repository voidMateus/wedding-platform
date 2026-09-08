import { describe, expect, it } from 'vitest'
import { emptyPerson, personFromGuest } from '../../../../app/utils/guest-person'
import { guestPersonSchema } from '#shared/schemas/guests'

/**
 * Estas funções existem justamente porque a duplicação anterior (uma cópia no
 * wizard do convidado principal, outra no passo de acompanhantes) fazia campo
 * novo entrar só numa delas e sumir na outra. Os testes abaixo guardam esse
 * risco: um campo do schema que não for mapeado aqui quebra o `keys` batendo
 * com `guestPersonSchema`, e não passa despercebido.
 */

/**
 * `id` só existe na edição (o formulário em branco não tem). `caminhoFoto`
 * está no schema mas **nenhuma tela o edita ainda** — a foto do convidado é
 * funcionalidade prevista (docs/PRODUCT.md §3.2), não implementada: hoje o
 * campo não é escrito por lugar nenhum e a coluna vive sempre nula. Quando a
 * foto entrar, ela precisa entrar nas duas funções e sair desta lista — é para
 * isso que a exceção é explícita aqui em vez de o teste simplesmente ignorar
 * campos faltantes.
 */
const FORA_DO_FORMULARIO = ['id', 'caminhoFoto']
const CHAVES_DO_SCHEMA = Object.keys(guestPersonSchema.shape).filter(
  (chave) => !FORA_DO_FORMULARIO.includes(chave),
)

describe('emptyPerson', () => {
  it('cobre todo campo editável do schema — campo novo sem estado inicial falha aqui', () => {
    expect(Object.keys(emptyPerson()).sort()).toEqual([...CHAVES_DO_SCHEMA].sort())
  })

  it('é aceito pelo schema (o formulário abre num estado válido de rascunho)', () => {
    const pessoa = { ...emptyPerson(), nomeCompleto: 'Maria Silva' }
    expect(guestPersonSchema.safeParse(pessoa).success).toBe(true)
  })

  it('não devolve a mesma referência duas vezes', () => {
    expect(emptyPerson()).not.toBe(emptyPerson())
  })
})

describe('personFromGuest', () => {
  const linha = {
    id: '11111111-1111-1111-1111-111111111111',
    nome_completo: 'Maria Silva',
    apelido: 'Mari',
    sexo: 'feminino',
    data_nascimento: '1990-01-01',
    faixa_etaria_manual: 'adulto',
    email: 'maria@exemplo.com',
    telefone: '(11) 91234-5678',
    papel_casamento: 'madrinha',
    observacoes: 'Chegará mais cedo',
    grupo_id: '22222222-2222-2222-2222-222222222222',
  }

  it('traduz a linha de convidados para o objeto do formulário', () => {
    expect(personFromGuest(linha)).toEqual({
      id: linha.id,
      nomeCompleto: 'Maria Silva',
      apelido: 'Mari',
      sexo: 'feminino',
      dataNascimento: '1990-01-01',
      faixaEtariaManual: 'adulto',
      email: 'maria@exemplo.com',
      telefone: '(11) 91234-5678',
      papelCasamento: 'madrinha',
      observacoes: 'Chegará mais cedo',
      grupoId: linha.grupo_id,
    })
  })

  it('traz contato de volta — o campo que sumia com as cópias duplicadas', () => {
    const pessoa = personFromGuest(linha)
    expect(pessoa.email).toBe('maria@exemplo.com')
    expect(pessoa.telefone).toBe('(11) 91234-5678')
  })

  it('converte nulo do banco em string vazia, nunca em null (o formulário edita texto)', () => {
    const pessoa = personFromGuest({
      ...linha,
      apelido: null,
      data_nascimento: null,
      email: null,
      telefone: null,
      observacoes: null,
      grupo_id: null,
    })

    expect(pessoa.apelido).toBe('')
    expect(pessoa.dataNascimento).toBe('')
    expect(pessoa.email).toBe('')
    expect(pessoa.telefone).toBe('')
    expect(pessoa.observacoes).toBe('')
    expect(pessoa.grupoId).toBe('')
  })

  it('deixa os campos de enum como undefined quando ausentes — "" não é opção válida do select', () => {
    const pessoa = personFromGuest({ ...linha, sexo: null, faixa_etaria_manual: null })

    expect(pessoa.sexo).toBeUndefined()
    expect(pessoa.faixaEtariaManual).toBeUndefined()
  })

  it('devolve algo que o schema aceita', () => {
    expect(guestPersonSchema.safeParse(personFromGuest(linha)).success).toBe(true)
  })
})
