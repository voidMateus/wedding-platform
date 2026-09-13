import { describe, expect, it } from 'vitest'
import {
  MODELOS_PADRAO,
  TIPOS_COMUNICACAO,
  VARIAVEIS_COMUNICACAO,
  modeloDoTipo,
  renderizarModelo,
} from '#shared/utils/modelo-comunicacao'

describe('renderizarModelo', () => {
  it('troca as variáveis conhecidas', () => {
    const texto = renderizarModelo('Oi, {{nome}}! Casamos em {{data}}. {{casal}}', {
      nome: 'Ana',
      data: '11/12/2027',
      casal: 'Mateus e Raquel',
    })

    expect(texto).toBe('Oi, Ana! Casamos em 11/12/2027. Mateus e Raquel')
  })

  it('tolera espaço dentro das chaves', () => {
    expect(renderizarModelo('Oi, {{ nome }}!', { nome: 'Ana' })).toBe('Oi, Ana!')
  })

  // Feio, visível e corrigível pelo casal. Apagá-la deixaria um buraco
  // silencioso no meio da frase, que é pior.
  it('deixa variável fora do catálogo literal no texto', () => {
    expect(renderizarModelo('Oi, {{nomee}}!', { nome: 'Ana' })).toBe('Oi, {{nomee}}!')
  })

  // Um casamento sem local cadastrado não pode travar o envio do convite.
  it('variável conhecida sem valor vira vazio, e a frase sobrevive', () => {
    const texto = renderizarModelo('Casamos em {{data}}, em {{local}}. Vem!', {
      data: '11/12/2027',
    })

    expect(texto).toBe('Casamos em 11/12/2027, em. Vem!')
    expect(texto).not.toContain('{{local}}')
    expect(texto).not.toContain('  ')
  })

  it('não deixa espaço antes de pontuação quando a variável do fim some', () => {
    expect(renderizarModelo('Confirme até {{prazo}}.', {})).toBe('Confirme até.')
  })

  it('texto sem variável nenhuma passa intacto', () => {
    expect(renderizarModelo('Mensagem simples', { nome: 'Ana' })).toBe('Mensagem simples')
  })
})

describe('modeloDoTipo', () => {
  it('usa o texto do casal quando existe', () => {
    expect(modeloDoTipo({ convite: 'Meu texto' }, 'convite')).toBe('Meu texto')
  })

  // Apagar o texto é como se volta ao padrão — por isso vazio e ausente
  // significam a mesma coisa aqui.
  it.each([
    [{ convite: '' }, 'vazio'],
    [{ convite: '   ' }, 'só espaço'],
    [{}, 'ausente'],
    [null, 'sem configuração nenhuma'],
  ])('cai no padrão com %s (%s)', (modelos) => {
    expect(modeloDoTipo(modelos, 'convite')).toBe(MODELOS_PADRAO.convite)
  })
})

describe('os modelos padrão', () => {
  it('existem para os três tipos', () => {
    for (const tipo of TIPOS_COMUNICACAO) {
      expect(MODELOS_PADRAO[tipo].length).toBeGreaterThan(0)
    }
  })

  // O padrão é conteúdo de verdade, não placeholder: quem nunca abrir o editor
  // manda uma mensagem que se sustenta — com nome, data e o que fazer.
  it('citam o nome de quem recebe e a data', () => {
    for (const tipo of TIPOS_COMUNICACAO) {
      expect(MODELOS_PADRAO[tipo]).toContain('{{nome}}')
    }
    expect(MODELOS_PADRAO.convite).toContain('{{link}}')
    expect(MODELOS_PADRAO.lembrete).toContain('{{link}}')
  })

  // O catálogo é fechado, e um padrão citando variável que o resolvedor não
  // conhece sairia com `{{...}}` literal na mensagem de todo mundo.
  it('só usam variáveis do catálogo', () => {
    const conhecidas = new Set<string>(VARIAVEIS_COMUNICACAO.map((v) => v.chave))

    for (const tipo of TIPOS_COMUNICACAO) {
      for (const [, chave] of MODELOS_PADRAO[tipo].matchAll(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g)) {
        expect(conhecidas.has(chave as string)).toBe(true)
      }
    }
  })

  // O mesmo texto vira corpo de e-mail na entrega seguinte, e asterisco solto
  // num e-mail é lixo visual.
  it('não usam formatação do WhatsApp', () => {
    for (const tipo of TIPOS_COMUNICACAO) {
      expect(MODELOS_PADRAO[tipo]).not.toMatch(/[*_~]/)
    }
  })
})
