import { serverSupabaseClient } from '#supabase/server'

// Sem autenticação e sem token de convidado — o site público é acessível a
// qualquer pessoa com o link (CLAUDE.md, seções 1/20/26). O client aqui usa
// a anon key (não service_role); o isolamento de leitura é garantido pela
// policy `casamentos_select_publico` (supabase/migrations/20260731100001).
// Resolvido por slug (CLAUDE.md, seção 4.4/33) — cada casamento tem sua
// própria URL, várias linhas de `casamentos` coexistem na mesma instância.
//
// select() explícito (não '*') de propósito — achado de segurança (varredura
// de 2026-08-19): `casamentos` já ganhou ~8 colunas via migrations
// sucessivas (prazo_rsvp, config_faixas_etarias, modo_lista_convidados,
// handle_infinitepay, modo_entrega_presente_fisico...), nenhuma sensível
// hoje, mas nada impedia uma coluna futura de vazar por padrão num endpoint
// sem autenticação. Lista abaixo é exatamente o que os consumidores
// públicos (Hero, StorySection, DressCodeSection, GuestManualSection,
// RsvpTeaserSection, FaqSection, WelcomeSection, SEO da home) usam hoje —
// checado via grep sobre usePublicWedding(). Um campo novo precisa ser
// adicionado aqui de propósito.
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('casamentos')
    .select('id, slug, nomes_noivos, data_evento, horario_evento, config_tema, config_conteudo')
    .eq('slug', slug)
    .single()

  if (error) {
    throw notFoundError('Casamento não encontrado.')
  }

  return data
})
