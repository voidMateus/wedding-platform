import type { ThemeConfig } from '#shared/schemas/theme'
import type { EventSegment } from '~/types/event-segment'
import type { Wedding } from '~/types/wedding'

const SITE_NAME = 'MeuSiteCasamento'

/**
 * Limite prático de descrição em resultado de busca. Não é regra do Google
 * (que corta por pixel, não por caractere), mas é o ponto em que um trecho
 * deixa de caber com folga nos formatos mais comuns.
 */
const MAX_DESCRIPTION_LENGTH = 155

/** Corta no espaço anterior ao limite, para não terminar no meio de uma palavra. */
function truncate(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Base absoluta do site, de `runtimeConfig.public.siteUrl`. Nunca um domínio
 * escrito no código: preview, produção e ambiente local respondem por hosts
 * diferentes, e um canonical apontando para o host errado é pior que nenhum —
 * ele diz ao buscador para indexar outra página.
 *
 * Sem a variável configurada, devolve string vazia, e quem chama omite as tags
 * que exigem URL absoluta em vez de emitir uma relativa (que Open Graph e
 * JSON-LD não aceitam).
 */
export function useSiteUrl(): ComputedRef<string> {
  const config = useRuntimeConfig()
  return computed(() => (config.public.siteUrl ?? '').replace(/\/+$/, ''))
}

/** `${siteUrl}/caminho`, sem barra dupla e sem barra final. Vazio se não há base. */
export function useAbsoluteUrl(path: MaybeRefOrGetter<string>): ComputedRef<string> {
  const siteUrl = useSiteUrl()
  return computed(() => {
    if (!siteUrl.value) return ''
    const clean = `/${toValue(path).replace(/^\/+/, '').replace(/\/+$/, '')}`
    return `${siteUrl.value}${clean === '/' ? '' : clean}`
  })
}

export interface WeddingSeoInput {
  wedding: Ref<Wedding | null | undefined>
  /** Cronograma já resolvido — o primeiro item com local vira o `location` do JSON-LD. */
  segments?: Ref<EventSegment[]>
}

/**
 * SEO da home pública: meta social completa, canonical e JSON-LD de Evento.
 *
 * Vive num composable e não solto na página porque as três coisas partem dos
 * mesmos dados derivados (URL absoluta, descrição, imagem de capa) e precisam
 * concordar entre si — um `og:url` que discorda do canonical é o tipo de
 * divergência que ninguém percebe olhando a página.
 *
 * Canonical só aqui, nunca no layout ou no app.vue: a tag descreve UMA página,
 * e declará-la num nível compartilhado faria toda rota do site público apontar
 * para o mesmo endereço.
 */
export function useWeddingSeo({ wedding, segments }: WeddingSeoInput): void {
  const slug = useWeddingSlug()
  const img = useImage()
  const canonicalUrl = useAbsoluteUrl(() => `/${slug}`)

  const coupleNames = computed(() => wedding.value?.nomes_noivos ?? '')

  const formattedDate = computed(() => {
    const date = wedding.value?.data_evento
    if (!date) return ''
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  })

  const venue = computed(() => segments?.value.find((segment) => segment.nome_local) ?? null)

  const title = computed(() =>
    coupleNames.value ? `${coupleNames.value} — Casamento` : 'Casamento não encontrado',
  )

  // Uma linha só, sem quebra: é o trecho que aparece no resultado de busca e
  // na prévia do WhatsApp. Cidade entra quando existe porque "onde" é metade
  // do que quem recebe o link quer saber antes de abrir.
  const description = computed(() => {
    if (!wedding.value) return ''
    const place = venue.value?.nome_local
    const cidade = venue.value?.cidade_local
    const local = [place, cidade].filter(Boolean).join(', ')
    const partes = [
      `Confira as informações do casamento de ${coupleNames.value}`,
      formattedDate.value ? `em ${formattedDate.value}` : '',
      local ? `— ${local}` : '',
      'e confirme sua presença.',
    ].filter(Boolean)
    return truncate(partes.join(' '))
  })

  /**
   * Imagem social em 1200x630, absoluta.
   *
   * Só existe quando há capa E a URL resultante já é absoluta com https —
   * Open Graph não resolve caminho relativo, e uma tag `og:image` apontando
   * para "/_ipx/..." simplesmente não renderiza prévia nenhuma. Preferimos
   * omitir a duas tags a mandar um placeholder: sem imagem o WhatsApp mostra
   * um cartão de texto correto; com imagem quebrada, mostra um cartão sujo.
   */
  const socialImage = computed(() => {
    const theme = (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>
    const cover = theme.coverImageUrl
    if (!cover) return undefined
    // `getURL` é opcional na tipagem do @nuxt/image; sem ele, a capa original
    // ainda serve como imagem social — só não vem no recorte 1200x630.
    const resized = img.getURL?.(cover, { width: 1200, height: 630, fit: 'cover' }) ?? cover
    return resized.startsWith('https://') ? resized : undefined
  })

  useSeoMeta({
    title: () => title.value,
    description: () => description.value || undefined,
    ogTitle: () => (wedding.value ? title.value : undefined),
    ogDescription: () => description.value || undefined,
    ogType: 'website',
    ogUrl: () => canonicalUrl.value || undefined,
    ogSiteName: SITE_NAME,
    ogLocale: 'pt_BR',
    ogImage: () => socialImage.value,
    twitterCard: 'summary_large_image',
    twitterTitle: () => (wedding.value ? title.value : undefined),
    twitterDescription: () => description.value || undefined,
    twitterImage: () => socialImage.value,
    robots: () => (wedding.value ? undefined : 'noindex, nofollow'),
  })

  useHead({
    link: () => (canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : []),
  })

  /**
   * JSON-LD de Evento. Toda chave sem dado real é OMITIDA — um `location` com
   * `name: null` não é "menos informação", é um dado inválido que reprova a
   * validação de dados estruturados inteira.
   *
   * `startDate` sai SEM offset de fuso (ex.: "2027-05-16T16:30:00"), e isso é
   * deliberado: nem `data_evento` nem `horario_evento` guardam timezone, então
   * qualquer offset aqui seria inventado. ISO 8601 sem offset significa
   * exatamente o que queremos dizer — a hora local do evento. Converter para
   * UTC com `toISOString()` seria pior: em produção o servidor roda em UTC, e
   * 16:30 em Cuiabá viraria 16:30Z, que é 12:30 na cidade do casamento.
   */
  const jsonLd = computed(() => {
    const value = wedding.value
    if (!value) return null

    const time = value.horario_evento ?? '00:00:00'
    const startDate = `${value.data_evento}T${time.length === 5 ? `${time}:00` : time}`

    const place = venue.value
    const streetAddress = [place?.logradouro_local, place?.numero_local].filter(Boolean).join(', ')

    const address = {
      '@type': 'PostalAddress',
      ...(streetAddress ? { streetAddress } : {}),
      ...(place?.cidade_local ? { addressLocality: place.cidade_local } : {}),
      ...(place?.estado_local ? { addressRegion: place.estado_local } : {}),
      addressCountry: 'BR',
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `Casamento de ${coupleNames.value}`,
      startDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      ...(canonicalUrl.value ? { url: canonicalUrl.value } : {}),
      ...(socialImage.value ? { image: [socialImage.value] } : {}),
      ...(place?.nome_local
        ? {
            location: {
              '@type': 'Place',
              name: place.nome_local,
              address,
            },
          }
        : {}),
      organizer: { '@type': 'Person', name: coupleNames.value },
    }
  })

  useHead({
    script: () =>
      jsonLd.value
        ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(jsonLd.value) }]
        : [],
  })
}
