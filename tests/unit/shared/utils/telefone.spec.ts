import { describe, expect, it } from 'vitest'
import { montarLinkWhatsApp, normalizarTelefoneE164, temWhatsApp } from '#shared/utils/telefone'

describe('normalizarTelefoneE164', () => {
  // O cadastro guarda o telefone COMO DIGITADO, então tudo isto chega.
  it.each([
    ['(31) 99999-8888', '5531999998888'],
    ['31999998888', '5531999998888'],
    ['31 9999-8888', '553199998888'],
    ['+55 31 99999-8888', '5531999998888'],
    ['5531999998888', '5531999998888'],
    ['  (31) 9 9999-8888  ', '5531999998888'],
  ])('normaliza %s', (bruto, esperado) => {
    expect(normalizarTelefoneE164(bruto)).toBe(esperado)
  })

  // Recusar é parte do contrato: um `wa.me` para número inválido abre uma
  // conversa com ninguém, e o casal só descobre depois de achar que mandou.
  it.each([
    ['', 'vazio'],
    ['   ', 'só espaço'],
    ['99998888', 'sem DDD'],
    ['999', 'curto demais'],
    ['31999998888999999', 'longo demais'],
    ['sem número', 'sem dígito'],
  ])('recusa %s (%s)', (bruto) => {
    expect(normalizarTelefoneE164(bruto)).toBeNull()
  })

  it('recusa nulo e indefinido', () => {
    expect(normalizarTelefoneE164(null)).toBeNull()
    expect(normalizarTelefoneE164(undefined)).toBeNull()
  })

  // Convidado que mora fora entra pelo `+`, e é o único caminho: sem ele, não
  // há como distinguir um DDI estrangeiro de um DDD brasileiro.
  it('aceita DDI estrangeiro quando vem com +', () => {
    expect(normalizarTelefoneE164('+351 912 345 678')).toBe('351912345678')
    expect(normalizarTelefoneE164('+1 415 555 2671')).toBe('14155552671')
  })

  // Sem o `+`, "351912345678" tem 12 dígitos e não começa com 55: não é
  // número nacional nem se declara internacional. Recusar é melhor que
  // adivinhar um DDI.
  it('recusa DDI estrangeiro sem o +', () => {
    expect(normalizarTelefoneE164('351912345678')).toBeNull()
  })

  // "55" na frente pode ser DDI ou o DDD 55 (Santa Maria/RS) — o desempate é o
  // tamanho do que sobra, e um celular de Santa Maria tem 11 dígitos com DDD.
  it('trata 55 como DDI só quando o resto tem cara de número nacional', () => {
    expect(normalizarTelefoneE164('55999998888')).toBe('5555999998888')
    expect(normalizarTelefoneE164('5531999998888')).toBe('5531999998888')
  })
})

describe('temWhatsApp', () => {
  it('responde pelo mesmo critério da normalização', () => {
    expect(temWhatsApp('(31) 99999-8888')).toBe(true)
    expect(temWhatsApp('99998888')).toBe(false)
    expect(temWhatsApp(null)).toBe(false)
  })
})

describe('montarLinkWhatsApp', () => {
  it('monta o wa.me com o texto escapado', () => {
    const link = montarLinkWhatsApp('(31) 99999-8888', 'Oi, Ana! Confirme aqui: http://x/y')

    expect(link).toContain('https://wa.me/5531999998888?text=')
    expect(link).toContain(encodeURIComponent('Oi, Ana! Confirme aqui: http://x/y'))
  })

  // Nulo é o que faz a tela mostrar "sem telefone" em vez de um botão que
  // finge funcionar.
  it('devolve nulo sem telefone utilizável', () => {
    expect(montarLinkWhatsApp('99998888', 'oi')).toBeNull()
    expect(montarLinkWhatsApp(null, 'oi')).toBeNull()
  })
})
