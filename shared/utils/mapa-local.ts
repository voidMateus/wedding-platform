/**
 * Como um local vira uma URL de mapa — o único lugar que sabe disso.
 *
 * Regra de negócio da Fase Localização (CLAUDE.md, seção 12): quando já
 * existe um `place_id`, "Ver no mapa" nunca refaz busca textual pelo
 * endereço. Busca textual é justamente o que produzia o ponto errado que
 * esta fase veio consertar — dois buffets com nome parecido na mesma
 * avenida resolvem para o primeiro que o Maps achar, não para o que o casal
 * escolheu.
 *
 * Ordem de precisão, da maior para a menor:
 *   1. URL oficial devolvida pelo provedor na seleção (`url_mapa_local`);
 *   2. `place_id` (`query_place_id` — o Maps resolve pelo id, o texto de
 *      `query` é só rótulo de fallback e não é usado para buscar);
 *   3. coordenadas do marcador posicionado à mão;
 *   4. endereço em texto — só as linhas legadas, sem nada melhor disponível.
 */

/**
 * Hosts aceitos em `url_mapa_local`. Esse valor chega do client (o admin
 * envia o que o endpoint de detalhes devolveu) e vira `href` no site público,
 * então nunca pode ser texto livre: sem allowlist, um membro mal-intencionado
 * do casamento plantaria um link de phishing — ou um `javascript:` — na
 * página que todo convidado abre. Cresce junto com a lista de provedores
 * suportados em server/utils/places-provider.ts.
 */
export const HOSTS_MAPA_PERMITIDOS = [
  'google.com',
  'www.google.com',
  'maps.google.com',
  'goo.gl',
  'maps.app.goo.gl',
] as const

export function ehUrlDeMapaSegura(valor: string): boolean {
  let url: URL
  try {
    url = new URL(valor)
  } catch {
    return false
  }
  // Só https: um link http seria degradado/bloqueado pelo navegador na
  // página pública, e `javascript:`/`data:` nunca podem virar href.
  if (url.protocol !== 'https:') return false
  return (HOSTS_MAPA_PERMITIDOS as readonly string[]).includes(url.hostname)
}

export interface LocalParaMapa {
  nome_local: string | null
  endereco_local: string | null
  latitude_local: number | null
  longitude_local: number | null
  place_id_local: string | null
  url_mapa_local: string | null
}

/** Rótulo textual do local — nunca sozinho como critério de busca quando há place_id. */
function rotuloDoLocal(local: LocalParaMapa): string | null {
  const texto = [local.nome_local, local.endereco_local].filter(Boolean).join(', ')
  return texto || null
}

/**
 * URL para abrir o local no Google Maps ("Ver no mapa"), ou null quando não
 * há nenhuma informação de local — nesse caso a ação não é renderizada, nunca
 * um botão que abre um mapa vazio.
 */
export function montarUrlMapa(local: LocalParaMapa): string | null {
  if (local.url_mapa_local && ehUrlDeMapaSegura(local.url_mapa_local)) {
    return local.url_mapa_local
  }

  const rotulo = rotuloDoLocal(local)

  if (local.place_id_local) {
    const query = encodeURIComponent(rotulo ?? '')
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(local.place_id_local)}`
  }

  if (local.latitude_local !== null && local.longitude_local !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${local.latitude_local},${local.longitude_local}`
  }

  if (rotulo) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rotulo)}`
  }

  return null
}

/**
 * Consulta do embed (iframe keyless — app/components/ui/VenueMap.vue).
 * Coordenadas primeiro: o embed sem chave de API não aceita `place_id`, então
 * o ponto exato só chega até ele como par lat/lng. Sem coordenadas, cai no
 * texto — a precisão possível para uma linha legada.
 */
export function montarConsultaEmbedMapa(local: LocalParaMapa): string | null {
  if (local.latitude_local !== null && local.longitude_local !== null) {
    return `${local.latitude_local},${local.longitude_local}`
  }
  return rotuloDoLocal(local)
}
