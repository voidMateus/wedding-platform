-- Vitrine pública de presentes (CLAUDE.md, seção 18.2) ganha filtro por
-- categoria (Fase Visual) — precisa ler o nome da categoria sem
-- autenticação, no mesmo padrão de leitura pública já usado para
-- weddings/event_segments (20260731100001_public_read_policies.sql).
-- Nenhuma coluna de gift_categories é sensível (só nome/ordem de exibição).

create policy gift_categories_select_public
  on gift_categories for select
  using (true);
