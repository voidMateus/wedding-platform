-- Foto opcional do local, por item do cronograma (CLAUDE.md, "Fase
-- Linguagem Visual") — pedido do usuário para o card de "O Grande Dia" não
-- ficar só texto+mapa. Upload manual pelo casal via /admin/cronograma
-- (mesmo padrão de storage.objects RLS da capa/galeria, ver migration
-- seguinte), nunca buscado automaticamente do Google (exigiria API paga,
-- fora do modelo "sem billing" do mapa embutido — CLAUDE.md seção 3).
-- Sem focal_x/focal_y: diferente de capa/história/galeria, não é uma foto
-- central emocionalmente — mesmo tratamento simples (object-cover, centro)
-- já usado pelas fotos de presente (GiftCard).

alter table event_segments
  add column image_url text;

comment on column event_segments.image_url is
  'URL pública da foto do local (Supabase Storage, bucket wedding-event-segments) — opcional, upload manual pelo casal.';
