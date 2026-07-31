-- Coordenadas do local (Fase Editorial — mapa interativo, comparativo com
-- concorrente). Totalmente opcional: sem latitude/longitude, a seção de
-- Cerimônia/Recepção continua funcionando normalmente, só sem o mapa
-- embutido (mesmo princípio de coverImageUrl — nunca um espaço quebrado).

alter table event_segments
  add column venue_latitude numeric,
  add column venue_longitude numeric;

comment on column event_segments.venue_latitude is
  'Latitude do local, opcional — usada para renderizar o mapa interativo (VenueMap.client.vue). Sem valor, a seção mostra só o botão "Abrir no Google Maps".';
comment on column event_segments.venue_longitude is
  'Longitude do local, opcional — ver comentário de venue_latitude.';
