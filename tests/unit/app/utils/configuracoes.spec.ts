import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SETTINGS_ASSUNTOS,
  SETTINGS_SECOES,
  abaDaSecao,
  assuntoDaSecao,
  secoesVisiveis,
} from '~/utils/admin-nav'
import { buscarConfiguracoes } from '~/utils/busca-de-configuracoes'

const PASTA_DOS_FORMULARIOS = join(process.cwd(), 'app', 'components', 'admin', 'settings')
const PAGINA = join(process.cwd(), 'app', 'pages', 'admin', '[slug]', 'configuracoes', 'index.vue')

describe('assuntos de Configurações', () => {
  /**
   * A ordem é a do uso, e ela é o item 22 da rodada de usabilidade — a lista
   * estava na ordem em que as telas foram construídas, com "Opções avançadas"
   * e "Classificação etária" no mesmo destaque de "O evento".
   *
   * O teste fixa a sequência porque ela é uma DECISÃO, não um acaso: sem ele,
   * o próximo assunto entra no fim (ou no começo) sem ninguém reparar que a
   * régua era outra.
   */
  it('estão na ordem de uso, com a conta por último', () => {
    expect(SETTINGS_ASSUNTOS.map((assunto) => assunto.label)).toEqual([
      'O evento',
      'Aparência',
      'Conteúdo',
      'RSVP e convidados',
      'Avisos',
      'Colaboradores',
      'Avançado',
      'Sua conta',
    ])
  })

  /**
   * Cada item do menu rola até um cartão, e o destino é o `section-id` dele.
   * Renomear um sem o outro deixa o item levando a lugar nenhum — em silêncio,
   * porque `scrollIntoView` num elemento inexistente não é erro.
   */
  it('toda seção tem o cartão correspondente em algum formulário', () => {
    const marcacao = readdirSync(PASTA_DOS_FORMULARIOS)
      .filter((arquivo) => arquivo.endsWith('.vue'))
      .map((arquivo) => readFileSync(join(PASTA_DOS_FORMULARIOS, arquivo), 'utf8'))
      .join('\n')

    const semCartao = SETTINGS_SECOES.filter(
      (secao) => !marcacao.includes(`section-id="${secao.id}"`),
    ).map((secao) => secao.id)

    expect(semCartao).toEqual([])
  })

  /**
   * A página escolhe o formulário pela `aba` da seção. Uma `aba` sem ramo na
   * página devolve uma tela em branco: nenhum `v-if` casa, e o `AdminSection`
   * fica só com o título.
   */
  it('toda aba declarada tem um ramo na página', () => {
    const pagina = readFileSync(PAGINA, 'utf8')
    const abas = [...new Set(SETTINGS_SECOES.map((secao) => secao.aba))]

    const semRamo = abas.filter((aba) => !pagina.includes(`aba === '${aba}'`))

    expect(semRamo).toEqual([])
  })

  it('resolve o assunto e a aba a partir da seção', () => {
    expect(assuntoDaSecao('faixas-etarias').label).toBe('RSVP e convidados')
    expect(abaDaSecao('faixas-etarias')).toBe('geral')
    expect(abaDaSecao('branding')).toBe('aparencia')
  })

  /**
   * "Avançado" é o assunto que atravessa dois formulários — o ajuste fino do
   * tema e o recebimento online. Cada item leva à própria tela, e nenhuma delas
   * mostra o cartão do outro formulário: mostrar exigiria duas barras de
   * salvamento na mesma tela, e o endpoint de Configurações substitui a linha
   * inteira do casamento.
   */
  it('a tela mostra só os cartões do assunto que o formulário dela possui', () => {
    expect(secoesVisiveis('avancado')).toEqual(['avancado'])
    expect(secoesVisiveis('pagamentos')).toEqual(['pagamentos'])
    expect(secoesVisiveis('rsvp')).toEqual(['rsvp', 'faixas-etarias'])
    expect(secoesVisiveis('evento')).toEqual(['evento'])
  })
})

describe('busca de configurações', () => {
  const buscar = (consulta: string) =>
    buscarConfiguracoes(consulta, 'ana-e-joao').map((resultado) => resultado.label)

  /**
   * O caso do relatório: ninguém procura "Experiência" para mexer na contagem
   * regressiva. É por isso que a seção carrega sinônimos, e é por isso que o
   * termo em inglês está entre eles.
   */
  it.each(['contagem', 'countdown', 'regressiva'])('"%s" leva à Experiência', (consulta) => {
    expect(buscar(consulta)).toContain('Experiência')
  })

  it('acha pelo rótulo e pelo sinônimo', () => {
    expect(buscar('branding')).toContain('Branding')
    expect(buscar('pix')).toContain('Presentes e pagamentos')
    expect(buscar('cerimonialista')).toContain('Convidar')
  })

  /** Quem digita depressa não digita acento. */
  it('ignora acento dos dois lados', () => {
    expect(buscar('secoes')).toContain('Ordem das seções')
    expect(buscar('versiculo')).toContain('Mensagens do site')
  })

  it('devolve o endereço da própria seção', () => {
    const [primeiro] = buscarConfiguracoes('countdown', 'ana-e-joao')

    expect(primeiro?.href).toBe('/admin/ana-e-joao/configuracoes?secao=experiencia')
    expect(primeiro?.sublabel).toBe('Configurações · Aparência')
  })

  it('não devolve nada para consulta vazia', () => {
    expect(buscarConfiguracoes('   ', 'ana-e-joao')).toEqual([])
  })

  /**
   * O limite é o que impede a busca de virar uma lista de tudo: com catorze
   * seções, uma consulta curta casaria com metade delas e empurraria convidados
   * e convites para fora da tela.
   */
  it('nunca devolve mais que quatro seções', () => {
    expect(buscarConfiguracoes('a', 'ana-e-joao').length).toBeLessThanOrEqual(4)
  })
})
