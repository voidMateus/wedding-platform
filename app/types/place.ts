/**
 * Shapes devolvidos por /api/places/** — espelham server/utils/places-provider.ts.
 *
 * Tipo compartilhado entre client e server nunca é duplicado (CLAUDE.md,
 * seção 8), mas o caminho contrário também não vale: `app/` não importa de
 * `server/`. Como estes DTOs atravessam a rede, eles moram aqui, em
 * `app/types/`, e o server os satisfaz pela sua própria interface. Em inglês
 * por serem DTOs de exibição, não linhas de tabela (CLAUDE.md, seção 6).
 */

export interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string | null
}

export interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  mapsUrl: string | null
  city: string | null
  state: string | null
}
