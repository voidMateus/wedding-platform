-- Galeria pública (Fase Editorial) — mesmo padrão de leitura pública já
-- usado para weddings/event_segments/gift_categories
-- (20260731100001_public_read_policies.sql, 20260731150001_gift_categories_select_public.sql).
-- Nenhuma coluna de photos é sensível (storage_path/caption/display_order),
-- então essa policy coexiste com photos_select_wedding_members sem conflito
-- — RLS combina policies da mesma operação com OR.

create policy photos_select_public
  on photos for select
  using (true);
