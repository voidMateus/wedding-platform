import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Os três endpoints (dados de negócio, tema, conteúdo — shared/schemas/
 * wedding.ts, theme.ts, content.ts) mutam a mesma linha de `casamentos`, sem
 * nenhuma referência cruzada entre eles — compartilham o mesmo casamento/
 * membro/cookie de setup para não pagar o custo de criar três casamentos.
 */
describe('api: PATCH /api/wedding, /api/wedding/theme, /api/wedding/content', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  describe('PATCH /api/wedding', () => {
    it('caminho feliz: atualiza os dados de negócio do casamento autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/wedding', {
        nomesNoivos: 'Ana & Bruno',
        dataEvento: '2031-06-15',
        horarioEvento: '16:00',
        prazoRsvp: '2031-05-01',
        idadeMaximaCrianca: 12,
        modoListaConvidados: 'aberta',
        handleInfinitepay: 'anaebruno',
        modoEntregaPresenteFisico: 'somente_compra_propria',
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.nomes_noivos).toBe('Ana & Bruno')
      expect(body.modo_lista_convidados).toBe('aberta')

      const { data: stored } = await admin
        .from('casamentos')
        .select('*')
        .eq('id', wedding.id)
        .single()
      expect(stored?.nomes_noivos).toBe('Ana & Bruno')
      expect(stored?.data_evento).toBe('2031-06-15')
      expect(stored?.horario_evento).toBe('16:00:00')
      expect(stored?.idade_maxima_crianca).toBe(12)
      expect(stored?.modo_lista_convidados).toBe('aberta')
      expect(stored?.handle_infinitepay).toBe('anaebruno')
      expect(stored?.modo_entrega_presente_fisico).toBe('somente_compra_propria')
    })

    it('erro de domínio: modoListaConvidados fora do enum é rejeitado com 400, a linha não muda', async () => {
      const client = createTestApiClient({ cookie })
      const { data: before } = await admin
        .from('casamentos')
        .select('nomes_noivos')
        .eq('id', wedding.id)
        .single()

      const res = await client.patch('/api/wedding', {
        nomesNoivos: 'Não Deve Salvar',
        dataEvento: '2031-06-15',
        idadeMaximaCrianca: 12,
        modoListaConvidados: 'invalida',
        modoEntregaPresenteFisico: 'ambos',
      })
      expect(res.status).toBe(400)

      const { data: after } = await admin
        .from('casamentos')
        .select('nomes_noivos')
        .eq('id', wedding.id)
        .single()
      expect(after?.nomes_noivos).toBe(before?.nomes_noivos)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.patch('/api/wedding', {
        nomesNoivos: 'Sem Sessão',
        dataEvento: '2031-06-15',
        idadeMaximaCrianca: 0,
        modoListaConvidados: 'aberta',
      })
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/wedding/theme', () => {
    it('caminho feliz: atualiza a aparência do site (config_tema) do casamento autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/wedding/theme', {
        presetId: '',
        primaryColor: '#6b4a35',
        secondaryColor: '#5f6f52',
        titleColor: '',
        bodyColor: '',
        fontPairId: 'classico',
        showCountdown: true,
        heroButtons: ['presentes', 'cronograma'],
        heroFeaturedButton: 'presentes',
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      const theme = body.config_tema as Record<string, unknown>
      expect(theme.primaryColor).toBe('#6b4a35')
      expect(theme.secondaryColor).toBe('#5f6f52')

      const { data: stored } = await admin
        .from('casamentos')
        .select('config_tema')
        .eq('id', wedding.id)
        .single()
      const storedTheme = stored?.config_tema as Record<string, unknown>
      expect(storedTheme.primaryColor).toBe('#6b4a35')
      expect(storedTheme.secondaryColor).toBe('#5f6f52')
      expect(storedTheme.fontPairId).toBe('classico')
      expect(storedTheme.showCountdown).toBe(true)
      expect(storedTheme.heroButtons).toEqual(['presentes', 'cronograma'])
      expect(storedTheme.heroFeaturedButton).toBe('presentes')
    })

    it('erro de domínio: cores sem contraste suficiente (branco sobre branco) são rejeitadas com 400, config_tema não muda', async () => {
      const client = createTestApiClient({ cookie })
      const { data: before } = await admin
        .from('casamentos')
        .select('config_tema')
        .eq('id', wedding.id)
        .single()

      const res = await client.patch('/api/wedding/theme', {
        presetId: '',
        primaryColor: '#ffffff',
        secondaryColor: '#ffffff',
        titleColor: '',
        bodyColor: '',
        fontPairId: 'classico',
        showCountdown: true,
        heroButtons: ['presentes'],
        heroFeaturedButton: 'presentes',
      })
      expect(res.status).toBe(400)

      const body = await res.json()
      // Trecho estável da mensagem, não a frase inteira: o texto é copy de
      // interface e vai mudar de redação; o que o teste garante é que o
      // servidor recusou POR CONTRASTE, não por outro motivo.
      expect(body.message).toContain('tom mais escuro')

      const { data: after } = await admin
        .from('casamentos')
        .select('config_tema')
        .eq('id', wedding.id)
        .single()
      expect(after?.config_tema).toEqual(before?.config_tema)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.patch('/api/wedding/theme', {
        primaryColor: '#6b4a35',
        secondaryColor: '#5f6f52',
        fontPairId: 'classico',
        showCountdown: true,
      })
      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/wedding/content', () => {
    it('caminho feliz: atualiza as mensagens narrativas (config_conteudo) do casamento autenticado', async () => {
      const client = createTestApiClient({ cookie })
      const res = await client.patch('/api/wedding/content', {
        welcomeTitle: 'Bem-vindos ao nosso grande dia',
        welcomeMessage: 'Estamos muito felizes em compartilhar este momento com vocês.',
        storyMessage: 'Nos conhecemos em 2020 e desde então não nos separamos mais.',
        dressCodeDescription: 'Traje esporte fino, cores neutras.',
        dressCodeSuggestions: ['Evitar branco'],
        guestManualIntro: 'Tudo que você precisa saber sobre o nosso casamento.',
        guestManualTopics: [],
        giftsIntroMessage: 'Sua presença já é o maior presente.',
        faqItems: [],
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      const content = body.config_conteudo as Record<string, unknown>
      expect(content.welcomeTitle).toBe('Bem-vindos ao nosso grande dia')

      const { data: stored } = await admin
        .from('casamentos')
        .select('config_conteudo')
        .eq('id', wedding.id)
        .single()
      const storedContent = stored?.config_conteudo as Record<string, unknown>
      expect(storedContent.welcomeTitle).toBe('Bem-vindos ao nosso grande dia')
      expect(storedContent.welcomeMessage).toBe(
        'Estamos muito felizes em compartilhar este momento com vocês.',
      )
      expect(storedContent.dressCodeSuggestions).toEqual(['Evitar branco'])
      expect(storedContent.guestManualTopics).toEqual([])
      expect(storedContent.faqItems).toEqual([])
    })

    it('erro de domínio: welcomeTitle acima do limite (120) é rejeitado com 400, config_conteudo não muda', async () => {
      const client = createTestApiClient({ cookie })
      const { data: before } = await admin
        .from('casamentos')
        .select('config_conteudo')
        .eq('id', wedding.id)
        .single()

      const res = await client.patch('/api/wedding/content', {
        welcomeTitle: 'a'.repeat(121),
        welcomeMessage: 'Estamos muito felizes em compartilhar este momento com vocês.',
        storyMessage: 'Nos conhecemos em 2020 e desde então não nos separamos mais.',
        dressCodeDescription: 'Traje esporte fino, cores neutras.',
        dressCodeSuggestions: [],
        guestManualIntro: 'Tudo que você precisa saber sobre o nosso casamento.',
        guestManualTopics: [],
        giftsIntroMessage: 'Sua presença já é o maior presente.',
        faqItems: [],
      })
      expect(res.status).toBe(400)

      const { data: after } = await admin
        .from('casamentos')
        .select('config_conteudo')
        .eq('id', wedding.id)
        .single()
      expect(after?.config_conteudo).toEqual(before?.config_conteudo)
    })

    it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
      const client = createTestApiClient()
      const res = await client.patch('/api/wedding/content', {
        welcomeTitle: 'Sem Sessão',
      })
      expect(res.status).toBe(401)
    })
  })
})
