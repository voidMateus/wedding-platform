import { serverSupabaseClient } from '#supabase/server'

// Sem autenticação e sem token de convidado — o site público é acessível a
// qualquer pessoa com o link (CLAUDE.md, seções 1/20/26). O client aqui usa
// a anon key (não service_role); o isolamento de leitura é garantido pela
// policy `weddings_select_public` (supabase/migrations/20260731100001).
// Resolvido por slug (CLAUDE.md, seção 4.4/33) — cada casamento tem sua
// própria URL, várias linhas de `weddings` coexistem na mesma instância.
//
// select() explícito (não '*') de propósito — achado de segurança (varredura
// de 2026-08-19): `weddings` já ganhou ~8 colunas via migrations sucessivas
// (rsvp_deadline, child_max_age, guest_list_mode, infinitepay_handle,
// physical_gift_delivery_mode...), nenhuma sensível hoje, mas nada impedia
// uma coluna futura de vazar por padrão num endpoint sem autenticação. Lista
// abaixo é exatamente o que os consumidores públicos (Hero, StorySection,
// DressCodeSection, GuestManualSection, RsvpTeaserSection, FaqSection,
// WelcomeSection, SEO da home) usam hoje — checado via grep sobre
// usePublicWedding(). Um campo novo precisa ser adicionado aqui de propósito.
export default defineEventHandler(async (event) => {
  const slug = getWeddingSlugParam(event)
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('weddings')
    .select('id, slug, couple_names, event_date, event_time, theme_config, content_config')
    .eq('slug', slug)
    .single()

  if (error) {
    throw notFoundError('Casamento não encontrado.')
  }

  return data
})
