-- Alguns casais fazem cerimônia e recepção no mesmo local — em vez de
-- cadastrar o endereço duas vezes (e arriscar ficar desatualizado se um dos
-- dois for editado depois), um segmento pode apontar para outro como fonte
-- de verdade do local. Auto-referência de um único nível: um segmento com
-- same_venue_as definido nunca é, ele mesmo, alvo de outro same_venue_as
-- (validado na camada de aplicação, shared/schemas/event-segments.ts —
-- evita corrente de referências).

alter table event_segments
  add column same_venue_as uuid references event_segments (id) on delete set null;

create index event_segments_same_venue_as_idx on event_segments (same_venue_as);

comment on column event_segments.same_venue_as is
  'Aponta para outro event_segment cujo local (venue_name/venue_address/venue_latitude/venue_longitude) deve ser reutilizado — evita duplicar o cadastro quando cerimônia e recepção são no mesmo lugar. Quando definido, os campos de local deste próprio registro são mantidos nulos (fonte de verdade única).';
