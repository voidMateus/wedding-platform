import { describe, expect, it } from 'vitest'
import { assuntoDeEmail, montarHtmlDeEmail } from '../../../server/utils/email-layout'

const base = {
  texto: 'Oi, Ana! Confirme em https://exemplo.com/casal/rsvp/ABC123',
  nomesNoivos: 'Ana e João',
}

describe('montarHtmlDeEmail', () => {
  it('transforma o endereço escrito no texto em link clicável', () => {
    const html = montarHtmlDeEmail(base)

    expect(html).toContain('href="https://exemplo.com/casal/rsvp/ABC123"')
  })

  it('não acrescenta um botão com o mesmo link — o link já está na frase do casal', () => {
    const html = montarHtmlDeEmail(base)
    const ancoras = html.match(/<a href="https:\/\/exemplo\.com\/casal\/rsvp\/ABC123"/g) ?? []

    // Uma âncora só: a do endereço no meio da frase. Um botão embaixo seria a
    // segunda, repetindo o mesmo link na mesma mensagem.
    expect(ancoras).toHaveLength(1)
  })

  it('escapa marcação vinda do texto — a mensagem é escrita pelo casal, não é confiável como HTML', () => {
    const html = montarHtmlDeEmail({
      ...base,
      texto: 'Oi <script>alert(1)</script> tudo bem?',
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapa marcação vinda do nome do casal', () => {
    const html = montarHtmlDeEmail({ ...base, nomesNoivos: 'Ana <b>&</b> João' })

    expect(html).not.toContain('Ana <b>&</b> João')
    expect(html).toContain('Ana &lt;b&gt;&amp;&lt;/b&gt; João')
  })

  it('quebra o texto em parágrafos por linha em branco', () => {
    const html = montarHtmlDeEmail({ ...base, texto: 'Primeiro.\n\nSegundo.' })

    expect(html.match(/<p style=/g) ?? []).toHaveLength(2)
  })

  it('usa a cor do casamento quando ela é um hex válido', () => {
    expect(montarHtmlDeEmail({ ...base, corPrimaria: '#123abc' })).toContain('#123abc')
  })

  it('ignora cor malformada em vez de injetá-la no atributo de estilo', () => {
    const html = montarHtmlDeEmail({ ...base, corPrimaria: 'red;background:url(x)' })

    expect(html).not.toContain('background:url(x)')
  })

  it('diz por que a pessoa recebeu a mensagem', () => {
    expect(montarHtmlDeEmail(base)).toContain('convidou você para o casamento')
  })

  it('inclui o texto de pré-visualização da caixa de entrada', () => {
    expect(montarHtmlDeEmail(base)).toContain('Oi, Ana! Confirme em')
  })
})

describe('assuntoDeEmail', () => {
  it('identifica a mensagem por quem a manda, não pelo estágio do funil', () => {
    expect(assuntoDeEmail('Ana e João', 'convite')).toBe('Casamento de Ana e João')
    expect(assuntoDeEmail('Ana e João', 'lembrete')).toBe('Confirme sua presença — Ana e João')
  })
})
